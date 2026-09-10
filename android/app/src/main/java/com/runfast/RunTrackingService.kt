package com.runfast

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.IBinder
import android.os.SystemClock

import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat

import com.google.android.gms.location.*

import kotlin.math.*

class RunTrackingService : Service() {

    companion object {

        const val CHANNEL_ID = "runfast_tracking"
        const val NOTIFICATION_ID = 1001

        const val ACTION_START = "RUNFAST_START"
        const val ACTION_STOP = "RUNFAST_STOP"
        const val ACTION_UPDATE = "RUNFAST_UPDATE"

        const val EXTRA_DISTANCE = "distance"
        const val EXTRA_SPEED = "speed"
        const val EXTRA_DURATION = "duration"
        const val EXTRA_LATITUDE = "latitude"
        const val EXTRA_LONGITUDE = "longitude"

        // SharedPreferences
        private const val PREFS_NAME = "RunFastTracking"
        private const val KEY_RUNNING = "running"
        private const val KEY_START_TIME = "start_time"
        private const val KEY_TOTAL_DISTANCE = "total_distance"
        private const val KEY_LAST_LATITUDE = "last_latitude"
        private const val KEY_LAST_LONGITUDE = "last_longitude"

        var isRunning = false
    }

    private lateinit var fusedLocationClient: FusedLocationProviderClient

    private lateinit var locationCallback: LocationCallback

    private var lastLatitude: Double? = null
    private var lastLongitude: Double? = null

    private var totalDistance = 0.0

    private var startTime = 0L

    private val prefs by lazy {
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    override fun onCreate() {
        super.onCreate()

        fusedLocationClient =
            LocationServices.getFusedLocationProviderClient(this)

        createNotificationChannel()

        locationCallback = object : LocationCallback() {

            override fun onLocationResult(
                result: LocationResult
            ) {

                for (location in result.locations) {

                    if (!isRunning) {
                        return
                    }

                    val latitude = location.latitude
                    val longitude = location.longitude

                    /*
                     * Calculate distance between
                     * previous and current GPS point.
                     */
                    if (
                        lastLatitude != null &&
                        lastLongitude != null
                    ) {

                        val distanceDelta =
                            calculateDistance(
                                lastLatitude!!,
                                lastLongitude!!,
                                latitude,
                                longitude
                            )

                        /*
                         * Ignore unrealistic GPS jumps.
                         */
                        if (
                            distanceDelta > 0 &&
                            distanceDelta < 100
                        ) {
                            totalDistance += distanceDelta
                        }
                    }

                    lastLatitude = latitude
                    lastLongitude = longitude

                    /*
                     * Persist latest tracking state.
                     */
                    saveTrackingState()

                    /*
                     * Duration is calculated from
                     * elapsedRealtime, not JS timer.
                     */
                    val duration =
                        (
                            SystemClock.elapsedRealtime() -
                            startTime
                        ) / 1000

                    /*
                     * Android location speed = m/s.
                     * Convert to km/h.
                     */
                    val speedMps =
                        if (location.hasSpeed()) {
                            location.speed.toDouble()
                        } else {
                            0.0
                        }

                    val speedKmh =
                        speedMps * 3.6

                    sendUpdate(
                        duration = duration,
                        distance = totalDistance,
                        speed = speedKmh,
                        latitude = latitude,
                        longitude = longitude
                    )

                    updateNotification(
                        duration,
                        totalDistance
                    )
                }
            }
        }

        /*
         * Restore previous state if Android
         * recreated the foreground service.
         */
        restoreTrackingState()
    }

    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int
    ): Int {

        when (intent?.action) {

            ACTION_START -> {
                startTracking()
            }

            ACTION_STOP -> {
                stopTracking()
            }
        }

        /*
         * Ask Android to recreate the service
         * if the process is killed.
         */
        return START_STICKY
    }

    private fun startTracking() {

        if (isRunning) {
            return
        }

        /*
         * Reset current run.
         */
        totalDistance = 0.0

        lastLatitude = null
        lastLongitude = null

        startTime =
            SystemClock.elapsedRealtime()

        isRunning = true

        saveTrackingState()

        /*
         * Foreground service MUST be promoted
         * before requesting continuous location.
         */
        startForeground(
            NOTIFICATION_ID,
            createNotification()
        )

        requestLocationUpdates()
    }

    private fun restoreTrackingState() {

        val wasRunning =
            prefs.getBoolean(
                KEY_RUNNING,
                false
            )

        if (!wasRunning) {
            return
        }

        val savedStartTime =
            prefs.getLong(
                KEY_START_TIME,
                0L
            )

        if (savedStartTime <= 0L) {
            clearTrackingState()
            return
        }

        startTime = savedStartTime

        totalDistance =
            prefs.getFloat(
                KEY_TOTAL_DISTANCE,
                0f
            ).toDouble()

        if (
            prefs.contains(KEY_LAST_LATITUDE) &&
            prefs.contains(KEY_LAST_LONGITUDE)
        ) {

            lastLatitude =
                prefs.getString(
                    KEY_LAST_LATITUDE,
                    null
                )?.toDoubleOrNull()

            lastLongitude =
                prefs.getString(
                    KEY_LAST_LONGITUDE,
                    null
                )?.toDoubleOrNull()
        }

        isRunning = true
    }

    private fun saveTrackingState() {

        val editor =
            prefs.edit()

        editor.putBoolean(
            KEY_RUNNING,
            isRunning
        )

        editor.putLong(
            KEY_START_TIME,
            startTime
        )

        /*
         * SharedPreferences does not have Double,
         * so store distance as Float.
         *
         * For normal running distances this is
         * sufficient for UI tracking.
         */
        editor.putFloat(
            KEY_TOTAL_DISTANCE,
            totalDistance.toFloat()
        )

        if (lastLatitude != null) {
            editor.putString(
                KEY_LAST_LATITUDE,
                lastLatitude.toString()
            )
        }

        if (lastLongitude != null) {
            editor.putString(
                KEY_LAST_LONGITUDE,
                lastLongitude.toString()
            )
        }

        editor.apply()
    }

    private fun clearTrackingState() {

        prefs.edit()
            .clear()
            .apply()

        isRunning = false

        totalDistance = 0.0

        lastLatitude = null
        lastLongitude = null

        startTime = 0L
    }

    private fun requestLocationUpdates() {

        /*
         * Precise location is required.
         */
        if (
            ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {

            clearTrackingState()

            stopForeground(
                STOP_FOREGROUND_REMOVE
            )

            stopSelf()

            return
        }

        val request =
            LocationRequest.Builder(
                Priority.PRIORITY_HIGH_ACCURACY,
                2000L
            )
                .setMinUpdateIntervalMillis(1000L)
                .setWaitForAccurateLocation(false)
                .setMaxUpdateDelayMillis(3000L)
                .build()

        fusedLocationClient.requestLocationUpdates(
            request,
            locationCallback,
            mainLooper
        )
    }

    private fun stopTracking() {

        if (!isRunning) {
            stopSelf()
            return
        }

        /*
         * Calculate exact final duration.
         */
        val finalDuration =
            (
                SystemClock.elapsedRealtime() -
                startTime
            ) / 1000

        val finalDistance =
            totalDistance

        val finalLatitude =
            lastLatitude ?: 0.0

        val finalLongitude =
            lastLongitude ?: 0.0

        /*
         * Send final data BEFORE clearing state.
         */
        sendUpdate(
            duration = finalDuration,
            distance = finalDistance,
            speed = 0.0,
            latitude = finalLatitude,
            longitude = finalLongitude
        )

        /*
         * Stop GPS updates.
         */
        fusedLocationClient.removeLocationUpdates(
            locationCallback
        )

        isRunning = false

        /*
         * Clear saved active-run state.
         */
        clearTrackingState()

        /*
         * Remove foreground notification.
         */
        stopForeground(
            STOP_FOREGROUND_REMOVE
        )

        stopSelf()
    }

    private fun sendUpdate(
        duration: Long,
        distance: Double,
        speed: Double,
        latitude: Double,
        longitude: Double
    ) {

        val intent =
            Intent(ACTION_UPDATE)

        /*
         * Keep broadcast inside our application.
         */
        intent.setPackage(packageName)

        intent.putExtra(
            EXTRA_DURATION,
            duration
        )

        intent.putExtra(
            EXTRA_DISTANCE,
            distance
        )

        intent.putExtra(
            EXTRA_SPEED,
            speed
        )

        intent.putExtra(
            EXTRA_LATITUDE,
            latitude
        )

        intent.putExtra(
            EXTRA_LONGITUDE,
            longitude
        )

        sendBroadcast(intent)
    }

    private fun createNotification(): Notification {

        val intent =
            Intent(
                this,
                MainActivity::class.java
            )

        val pendingIntent =
            PendingIntent.getActivity(
                this,
                0,
                intent,
                PendingIntent.FLAG_IMMUTABLE or
                    PendingIntent.FLAG_UPDATE_CURRENT
            )

        return NotificationCompat.Builder(
            this,
            CHANNEL_ID
        )
            .setContentTitle("RunFast")
            .setContentText(
                "Run is in progress"
            )
            .setSmallIcon(
                R.mipmap.ic_launcher
            )
            .setOngoing(true)
            .setContentIntent(
                pendingIntent
            )
            .setPriority(
                NotificationCompat.PRIORITY_LOW
            )
            .build()
    }

    private fun updateNotification(
        duration: Long,
        distance: Double
    ) {

        val notificationManager =
            getSystemService(
                NOTIFICATION_SERVICE
            ) as NotificationManager

        val km =
            distance / 1000.0

        val minutes =
            duration / 60

        val seconds =
            duration % 60

        val notification =
            NotificationCompat.Builder(
                this,
                CHANNEL_ID
            )
                .setContentTitle(
                    "RunFast • Running"
                )
                .setContentText(
                    String.format(
                        "%.2f km • %02d:%02d",
                        km,
                        minutes,
                        seconds
                    )
                )
                .setSmallIcon(
                    R.mipmap.ic_launcher
                )
                .setOngoing(true)
                .setPriority(
                    NotificationCompat.PRIORITY_LOW
                )
                .build()

        notificationManager.notify(
            NOTIFICATION_ID,
            notification
        )
    }

    private fun createNotificationChannel() {

        if (
            Build.VERSION.SDK_INT >=
            Build.VERSION_CODES.O
        ) {

            val channel =
                NotificationChannel(
                    CHANNEL_ID,
                    "Run Tracking",
                    NotificationManager.IMPORTANCE_LOW
                )

            channel.description =
                "Shows active RunFast GPS tracking"

            val manager =
                getSystemService(
                    NOTIFICATION_SERVICE
                ) as NotificationManager

            manager.createNotificationChannel(
                channel
            )
        }
    }

    private fun calculateDistance(
        lat1: Double,
        lon1: Double,
        lat2: Double,
        lon2: Double
    ): Double {

        val earthRadius =
            6371000.0

        val dLat =
            Math.toRadians(
                lat2 - lat1
            )

        val dLon =
            Math.toRadians(
                lon2 - lon1
            )

        val a =
            sin(dLat / 2).pow(2) +
                cos(
                    Math.toRadians(lat1)
                ) *
                cos(
                    Math.toRadians(lat2)
                ) *
                sin(dLon / 2).pow(2)

        val c =
            2 *
                atan2(
                    sqrt(a),
                    sqrt(1 - a)
                )

        return earthRadius * c
    }

    override fun onBind(
        intent: Intent?
    ): IBinder? {
        return null
    }

    override fun onDestroy() {

        fusedLocationClient
            .removeLocationUpdates(
                locationCallback
            )

        /*
         * Do NOT clear saved state here.
         *
         * If Android recreates the service,
         * restoreTrackingState() can recover it.
         */
        super.onDestroy()
    }
}