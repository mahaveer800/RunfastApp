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
import android.content.pm.ServiceInfo
import android.location.Location
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.SystemClock
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*

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

    private var lastLocation: Location? = null
    private var totalDistance = 0.0
    private var startTime = 0L
    private var currentSpeedKmh = 0.0

    private val prefs by lazy {
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    // 1-second timer UI update & Notification sync ke liye
    private val timerHandler = Handler(Looper.getMainLooper())
    private val timerRunnable = object : Runnable {
        override fun run() {
            if (!isRunning) return

            val duration = (SystemClock.elapsedRealtime() - startTime) / 1000

            sendUpdate(
                duration = duration,
                distance = totalDistance,
                speed = currentSpeedKmh,
                latitude = lastLocation?.latitude ?: 0.0,
                longitude = lastLocation?.longitude ?: 0.0
            )

            updateNotification(duration, totalDistance)
            timerHandler.postDelayed(this, 1000L)
        }
    }

    override fun onCreate() {
        super.onCreate()

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        createNotificationChannel()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                if (!isRunning) return

                for (location in result.locations) {

                    // 1. Accuracy Filter: Poor accuracy points (>25m error) ko discard karo
                    if (location.hasAccuracy() && location.accuracy > 25f) {
                        continue
                    }

                    if (lastLocation != null) {
                        val distanceDelta = lastLocation!!.distanceTo(location).toDouble() // meters
                        val timeDelta = (location.time - lastLocation!!.time) / 1000.0 // seconds

                        // 2. Minimum Movement Threshold: Real movement hi add ho (Drift prevention)
                        if (distanceDelta >= 2.0 && timeDelta > 0) {
                            val calculatedSpeedMps = distanceDelta / timeDelta
                            
                            // Human running speed threshold check (Max ~43 km/h or 12 m/s)
                            if (calculatedSpeedMps <= 12.0) {
                                totalDistance += distanceDelta
                            }
                        }
                    }

                    // 3. Current Speed Calculation
                    currentSpeedKmh = if (location.hasSpeed()) {
                        location.speed * 3.6
                    } else {
                        currentSpeedKmh
                    }

                    lastLocation = location
                    saveTrackingState()
                }
            }
        }

        restoreTrackingState()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> startTracking()
            ACTION_STOP -> stopTracking()
        }
        return START_STICKY
    }

    private fun startTracking() {
        if (isRunning) return

        totalDistance = 0.0
        lastLocation = null
        currentSpeedKmh = 0.0
        startTime = SystemClock.elapsedRealtime()

        isRunning = true
        saveTrackingState()

        // Android 10+ location service type promotion
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                createNotification(),
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            )
        } else {
            startForeground(NOTIFICATION_ID, createNotification())
        }

        requestLocationUpdates()
        timerHandler.post(timerRunnable) // Timer start
    }

    private fun restoreTrackingState() {
        val wasRunning = prefs.getBoolean(KEY_RUNNING, false)
        if (!wasRunning) return

        val savedStartTime = prefs.getLong(KEY_START_TIME, 0L)
        if (savedStartTime <= 0L) {
            clearTrackingState()
            return
        }

        startTime = savedStartTime
        totalDistance = prefs.getFloat(KEY_TOTAL_DISTANCE, 0f).toDouble()

        if (prefs.contains(KEY_LAST_LATITUDE) && prefs.contains(KEY_LAST_LONGITUDE)) {
            val lat = prefs.getString(KEY_LAST_LATITUDE, null)?.toDoubleOrNull()
            val lng = prefs.getString(KEY_LAST_LONGITUDE, null)?.toDoubleOrNull()
            if (lat != null && lng != null) {
                lastLocation = Location("saved").apply {
                    latitude = lat
                    longitude = lng
                }
            }
        }

        isRunning = true
        timerHandler.post(timerRunnable)
    }

    private fun saveTrackingState() {
        val editor = prefs.edit()
        editor.putBoolean(KEY_RUNNING, isRunning)
        editor.putLong(KEY_START_TIME, startTime)
        editor.putFloat(KEY_TOTAL_DISTANCE, totalDistance.toFloat())

        lastLocation?.let {
            editor.putString(KEY_LAST_LATITUDE, it.latitude.toString())
            editor.putString(KEY_LAST_LONGITUDE, it.longitude.toString())
        }
        editor.apply()
    }

    private fun clearTrackingState() {
        timerHandler.removeCallbacks(timerRunnable)
        prefs.edit().clear().apply()
        isRunning = false
        totalDistance = 0.0
        lastLocation = null
        startTime = 0L
        currentSpeedKmh = 0.0
    }

    private fun requestLocationUpdates() {
        if (ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            clearTrackingState()
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return
        }

        val request = LocationRequest.Builder(
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

        timerHandler.removeCallbacks(timerRunnable) // Timer stop

        val finalDuration = (SystemClock.elapsedRealtime() - startTime) / 1000

        sendUpdate(
            duration = finalDuration,
            distance = totalDistance,
            speed = 0.0,
            latitude = lastLocation?.latitude ?: 0.0,
            longitude = lastLocation?.longitude ?: 0.0
        )

        fusedLocationClient.removeLocationUpdates(locationCallback)
        isRunning = false
        clearTrackingState()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun sendUpdate(
        duration: Long,
        distance: Double,
        speed: Double,
        latitude: Double,
        longitude: Double
    ) {
        val intent = Intent(ACTION_UPDATE).apply {
            setPackage(packageName)
            putExtra(EXTRA_DURATION, duration)
            putExtra(EXTRA_DISTANCE, distance)
            putExtra(EXTRA_SPEED, speed)
            putExtra(EXTRA_LATITUDE, latitude)
            putExtra(EXTRA_LONGITUDE, longitude)
        }
        sendBroadcast(intent)
    }

    private fun createNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("RunFast")
            .setContentText("Run is in progress")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun updateNotification(duration: Long, distance: Double) {
        val notificationManager =
            getSystemService(NOTIFICATION_SERVICE) as NotificationManager

        val km = distance / 1000.0
        val minutes = duration / 60
        val seconds = duration % 60

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("RunFast • Running")
            .setContentText(
                String.format("%.2f km • %02d:%02d", km, minutes, seconds)
            )
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        notificationManager.notify(NOTIFICATION_ID, notification)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Run Tracking",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows active RunFast GPS tracking"
            }

            val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        timerHandler.removeCallbacks(timerRunnable)
        fusedLocationClient.removeLocationUpdates(locationCallback)
        super.onDestroy()
    }
}