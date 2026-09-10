package com.runfast

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class RunTrackingModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    private val receiver = object : BroadcastReceiver() {

        override fun onReceive(
            context: Context?,
            intent: Intent?
        ) {

            if (
                intent?.action ==
                RunTrackingService.ACTION_UPDATE
            ) {

                val map =
                    Arguments.createMap()

                map.putDouble(
                    "duration",
                    intent.getLongExtra(
                        RunTrackingService.EXTRA_DURATION,
                        0
                    ).toDouble()
                )

                map.putDouble(
                    "distance",
                    intent.getDoubleExtra(
                        RunTrackingService.EXTRA_DISTANCE,
                        0.0
                    )
                )

                map.putDouble(
                    "speed",
                    intent.getDoubleExtra(
                        RunTrackingService.EXTRA_SPEED,
                        0.0
                    )
                )

                map.putDouble(
                    "latitude",
                    intent.getDoubleExtra(
                        RunTrackingService.EXTRA_LATITUDE,
                        0.0
                    )
                )

                map.putDouble(
                    "longitude",
                    intent.getDoubleExtra(
                        RunTrackingService.EXTRA_LONGITUDE,
                        0.0
                    )
                )

                reactContext
                    .getJSModule(
                        DeviceEventManagerModule.RCTDeviceEventEmitter::class.java
                    )
                    .emit(
                        "RunTrackingUpdate",
                        map
                    )
            }
        }
    }

    init {

        val filter =
            IntentFilter(
                RunTrackingService.ACTION_UPDATE
            )

        if (Build.VERSION.SDK_INT >= 33) {

            reactContext.registerReceiver(
                receiver,
                filter,
                Context.RECEIVER_NOT_EXPORTED
            )

        } else {

            reactContext.registerReceiver(
                receiver,
                filter
            )
        }
    }

    override fun getName(): String {
        return "RunTracking"
    }

    @ReactMethod
    fun startRun() {

        val intent =
            Intent(
                reactContext,
                RunTrackingService::class.java
            )

        intent.action =
            RunTrackingService.ACTION_START

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {

            reactContext.startForegroundService(intent)

        } else {

            reactContext.startService(intent)
        }
    }

    @ReactMethod
    fun stopRun() {

        val intent =
            Intent(
                reactContext,
                RunTrackingService::class.java
            )

        intent.action =
            RunTrackingService.ACTION_STOP

        reactContext.startService(intent)
    }

    override fun invalidate() {

        try {
            reactContext.unregisterReceiver(receiver)
        } catch (_: Exception) {
        }

        super.invalidate()
    }
}
