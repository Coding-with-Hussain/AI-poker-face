# Face Landmarker model (local copy)

`face_landmarker.task` is the official MediaPipe **Face Landmarker** model bundle
(float16, version 1), downloaded from Google's MediaPipe model storage:

```
https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
```

| Property | Value |
| --- | --- |
| Size | 3,758,596 bytes |
| SHA-256 | `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff` |
| Contents | `face_detector.tflite`, `face_landmarks_detector.tflite`, `face_blendshapes.tflite`, `geometry_pipeline_metadata_landmarks.binarypb` |
| Outputs used by the game | 478 face landmarks + 52 face blendshape scores |

It is stored here so the game works offline. `npm run setup-assets` verifies the
checksum and re-downloads the file only if it is missing. See the MediaPipe Face
Landmarker model card (linked from the MediaPipe documentation) for the model's
license and intended-use notes.
