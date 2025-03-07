"use client";

import React, { useState, useEffect, useRef } from "react";
import { Box, Typography, MenuItem, Select, FormControl, InputLabel, Button } from "@mui/material";

type MediaDevice = MediaDeviceInfo;

const WebRTCSourcesImage: React.FC = () => {
    const [videoDevices, setVideoDevices] = useState<MediaDevice[]>([]);
    const [audioDevices, setAudioDevices] = useState<MediaDevice[]>([]);
    const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
    const [capturedImages, setCapturedImages] = useState<string[]>([]);  // Store captured images as base64 strings
    const [noMotionDetected, setNoMotionDetected] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);  // Audio level state

    const videoSelectRef = useRef<HTMLSelectElement | null>(null);
    const audioSelectRef = useRef<HTMLSelectElement | null>(null);
    const videoOutputRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const lastImageRef = useRef<HTMLImageElement | null>(null);

    // เพิ่ม state สำหรับบันทึกวิดีโอ
    const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const videoDeviceIdRef = useRef<string | null>(null);
    const audioDeviceIdRef = useRef<string | null>(null);

    useEffect(() => {
        const getDevices = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                setVideoDevices(devices.filter((device) => device.kind === "videoinput"));
                setAudioDevices(devices.filter((device) => device.kind === "audioinput"));
            } catch (error) {
                console.error("Error fetching devices:", error);
            }
        };

        // Example usage
        (async () => {
            const hasPermission = await requestDevicePermission();
            if (hasPermission) {
                getDevices();
            } else {
                console.log('Cannot list devices without permission.');
            }
        })();
    }, []);

    // Request permission for media devices
    async function requestDevicePermission() {
        try {
            // Request access to audio and video devices
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

            console.log('Permission granted:', stream);

            // Release the media stream after permission is granted
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());

            return true; // Permission granted
        } catch (error) {
            console.error('Permission denied or error occurred:', error);
            return false; // Permission denied
        }
    }

    useEffect(() => {
        if (lastImageRef.current) {
            lastImageRef.current.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                inline: "end",
            });
        }
    }, [capturedImages]);

    const stopStream = (stream: MediaStream | null) => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
        }
    };

    const startStream = async (videoDeviceId: string, audioDeviceId: string) => {
        try {
            stopStream(currentStream);

            videoDeviceIdRef.current = videoDeviceId
            audioDeviceIdRef.current = audioDeviceId

            const constraints: MediaStreamConstraints = {
                video: {
                    deviceId: videoDeviceId ? { exact: videoDeviceId } : undefined,
                    width: { exact: 1920 },
                    height: { exact: 1080 },
                },
                // audio: true,
                audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            if (videoOutputRef.current) {
                videoOutputRef.current.srcObject = stream;
            }
            setCurrentStream(stream);
            // setupAudioAnalyser(stream);

            detectMotion();
        } catch (error) {
            console.error("Error accessing media devices:", error);
        }
    };

    // Function to set up audio analyser
    const setupAudioAnalyser = (stream: MediaStream) => {
        if (!audioContextRef.current) {
            audioContextRef.current = new AudioContext();
        }

        const audioContext = audioContextRef.current;

        // Create an analyser node
        analyserRef.current = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyserRef.current);

        // Set analyser node properties
        analyserRef.current.fftSize = 256;  // Size of FFT (Frequency-domain)
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        let oneShot = true;

        // Monitor audio level
        const monitorAudioLevel = () => {
            analyserRef.current?.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const average = Math.ceil(sum / bufferLength);
            setAudioLevel(average);  // Set the audio level state
            if (average > 15 && oneShot) {
                oneShot = false;
                captureImage();
            } else if (average <= 5) {
                oneShot = true;
            }

            console.log(oneShot, average)

            requestAnimationFrame(monitorAudioLevel);
        };

        monitorAudioLevel();
    };

    const detectMotion = () => {
        if (!videoOutputRef.current || !canvasRef.current) return;

        const video = videoOutputRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        let lastImageData: ImageData | null = null;
        let motionDetectedAt: number | null = null; // Time when motion is detected
        let oneShot = true

        const checkForMotion = () => {
            if (!context) return;

            // Draw current video frame to canvas
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            const currentImageData = context.getImageData(0, 0, canvas.width, canvas.height);

            if (lastImageData) {
                const motion = isMotionDetected(lastImageData, currentImageData);
                if (!motion) {
                    // If motion is detected, record the time it was detected
                    if (motionDetectedAt === null) {
                        motionDetectedAt = Date.now();
                    } else if (Date.now() - motionDetectedAt > 1000 && oneShot) {
                        // If motion has been detected for more than 1 second, capture image
                        captureImage();
                        motionDetectedAt = null; // Reset after capturing image
                        oneShot = false;
                    }
                } else {
                    motionDetectedAt = null;
                    oneShot = true
                }
                setNoMotionDetected(!motion);
            }


            lastImageData = currentImageData;

            requestAnimationFrame(checkForMotion);
        };

        checkForMotion();
    };

    const isMotionDetected = (prev: ImageData, curr: ImageData): boolean => {
        const threshold = 50; // Difference threshold
        const motionPixels = 500; // Minimum pixel changes for motion
        let diffCount = 0;

        for (let i = 0; i < prev.data.length; i += 4) {
            const diff =
                Math.abs(prev.data[i] - curr.data[i]) + // Red
                Math.abs(prev.data[i + 1] - curr.data[i + 1]) + // Green
                Math.abs(prev.data[i + 2] - curr.data[i + 2]); // Blue

            if (diff > threshold) {
                diffCount++;
            }

            if (diffCount > motionPixels) {
                return true; // Motion detected
            }
        }

        return false; // No motion
    };

    const isImageUnique = (newImage: string) => {
        // Check if there is any captured image
        if (capturedImages.length === 0) return true; // No images, so the new image is unique

        const lastCapturedImage = capturedImages[capturedImages.length - 1];

        const newImageElement = new Image();
        newImageElement.src = newImage;

        // Create a canvas to compare images
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        newImageElement.onload = () => {
            canvas.width = newImageElement.width;
            canvas.height = newImageElement.height;
            context?.drawImage(newImageElement, 0, 0);

            const newImageData = context?.getImageData(0, 0, canvas.width, canvas.height);

            const previousImageElement = new Image();
            previousImageElement.src = lastCapturedImage;

            previousImageElement.onload = () => {
                const prevCanvas = document.createElement("canvas");
                const prevContext = prevCanvas.getContext("2d");

                prevCanvas.width = previousImageElement.width;
                prevCanvas.height = previousImageElement.height;
                prevContext?.drawImage(previousImageElement, 0, 0);

                const previousImageData = prevContext?.getImageData(0, 0, prevCanvas.width, prevCanvas.height);

                // Compare the current image with the previous one
                // console.log("check image unique", isImagesEqual(newImageData, previousImageData))
                if (isImagesEqual(newImageData, previousImageData)) {
                    return false; // Images are the same
                }

                return true; // Images are unique
            };
        };
    };

    // Function to compare two ImageData objects
    const isImagesEqual = (imageData1?: ImageData | null, imageData2?: ImageData | null): boolean => {
        if (!imageData1 || !imageData2) return false;

        const data1 = imageData1.data;
        const data2 = imageData2.data;

        if (data1.length !== data2.length) return false;

        for (let i = 0; i < data1.length; i++) {
            if (data1[i] !== data2[i]) {
                return false; // If any pixel is different, return false
            }
        }

        return true; // Images are equal
    };

    const captureImage = () => {
        if (!videoOutputRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        // Draw current video frame to canvas
        context?.drawImage(videoOutputRef.current, 0, 0, canvas.width, canvas.height);

        const imageDataUrl = canvas.toDataURL("image/png");

        // Check if the image is unique before adding it
        if (isImageUnique(imageDataUrl)) {
            setCapturedImages((prevImages) => [...prevImages, imageDataUrl]);

            // Play sound after capturing image
            const captureSound = new Audio("/iphone-camera-capture-6448.mp3"); // Ensure the file path is correct
            captureSound.play();
        }
    };

    // ฟังก์ชันเริ่มบันทึกวิดีโอ
    const startRecording = () => {
        if (!currentStream) return;

        const recorder = new MediaRecorder(currentStream, { mimeType: "video/webm" });
        mediaRecorderRef.current = recorder;
        setRecordedChunks([]);

        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                setRecordedChunks((prev) => [...prev, event.data]);
            }
        };

        recorder.start();
        setIsRecording(true);
    };

    // ฟังก์ชันหยุดบันทึกวิดีโอ
    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    };

    // ดาวน์โหลดวิดีโอที่บันทึกไว้
    const downloadVideo = () => {
        if (recordedChunks.length === 0) return;

        const blob = new Blob(recordedChunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "recorded-video.webm";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    };

    async function connectSerial() {
        try {
            // ขออนุญาตเชื่อมต่อกับ Serial Port
            const port = await (navigator as any).serial.requestPort();
            await port.open({ baudRate: 9600 }); // ตั้งค่า baud rate ให้ตรงกับอุปกรณ์

            // อ่านข้อมูลจาก Serial Port
            const reader = port.readable.getReader();

            while (true) {
                console.log("test")
                const { value, done } = await reader.read();
                // if (done) break; // ออกจากลูปเมื่อไม่มีข้อมูล

                // แปลงข้อมูลจาก Uint8Array เป็นข้อความ
                const text = new TextDecoder().decode(value);
                console.log("Received:", text);
            }

            reader.releaseLock();
            await port.close();
        } catch (error) {
            console.error("Error:", error);
        }
    }

    return (
        <Box sx={{ padding: 2 }}>
            <Typography variant="h4" gutterBottom>
                WebRTC Image Detect: Select Video & Audio Sources
            </Typography>

            <FormControl fullWidth margin="normal">
                <InputLabel id="video-select-label">Select Video Source</InputLabel>
                <Select
                    labelId="video-select-label"
                    inputRef={videoSelectRef}
                    onChange={(event) => {
                        console.log(event.target.name, event.target.value)
                        startStream(
                            event.target.value || "",
                            audioDeviceIdRef.current || ""
                        )
                    }
                    }
                    defaultValue=""
                >
                    <MenuItem value="">Select Video Source</MenuItem>
                    {videoDevices.map((device) => (
                        <MenuItem key={device.deviceId} value={device.deviceId}>
                            {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <FormControl fullWidth margin="normal">
                <InputLabel id="audio-select-label">Select Audio Source</InputLabel>
                <Select
                    labelId="audio-select-label"
                    inputRef={audioSelectRef}
                    onChange={(event) =>
                        startStream(
                            videoDeviceIdRef.current || "",
                            event.target.value || ""
                        )
                    }
                    defaultValue=""
                >
                    <MenuItem value="">Select Audio Source</MenuItem>
                    {audioDevices.map((device) => (
                        <MenuItem key={device.deviceId} value={device.deviceId}>
                            {device.label || `Microphone ${audioDevices.indexOf(device) + 1}`}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            <Box>
                <Typography variant="h6" gutterBottom>
                    Video Output
                </Typography>

                <Typography variant="h6" color="error" sx={{ marginBottom: 2 }}>
                    {`${noMotionDetected ? 'No motion detected!' : 'motion detected!'}`}
                </Typography>

                <video
                    ref={videoOutputRef}
                    autoPlay
                    playsInline
                    width={640}
                    height={480}
                    style={{ border: "1px solid #ccc", display: "block", marginTop: 2 }}
                />
                <canvas
                    ref={canvasRef}
                    width={640}
                    height={480}
                    style={{ display: "none" }}
                />
            </Box>

            <Typography variant="h6" sx={{ marginTop: 2 }}>
                Image Capture {capturedImages.length} Pic
            </Typography>
            <Typography variant="h6" sx={{ marginTop: 2 }}>
                Audio Level: {audioLevel}
            </Typography>

            <Box sx={{ display: "flex", marginTop: 2, flexWrap: "nowrap", overflowX: "auto", width: "500px" }}>
                {capturedImages.map((imageSrc, index) => (
                    <Box key={index} sx={{ marginRight: 2 }}>
                        <img
                            ref={index === capturedImages.length - 1 ? lastImageRef : null} // Assign ref to last image
                            src={imageSrc}
                            alt={`Captured Image ${index + 1}`}
                            width={150}
                            height={100}
                            style={{
                                border: index === capturedImages.length - 1 ? "3px solid #4caf50" : "none", // Border for last image
                            }}
                        />
                    </Box>
                ))}
            </Box>

            <Box sx={{ marginTop: 2 }}>
                <Button
                    variant="contained"
                    color={isRecording ? "secondary" : "primary"}
                    onClick={isRecording ? stopRecording : startRecording}
                >
                    {isRecording ? "Stop Recording" : "Start Recording"}
                </Button>

                {recordedChunks.length > 0 && (
                    <Button
                        variant="contained"
                        color="success"
                        sx={{ marginLeft: 2 }}
                        onClick={downloadVideo}
                    >
                        Download Video
                    </Button>
                )}
            </Box>

            {recordedChunks.length > 0 && (
                <Box sx={{ marginTop: 2 }}>
                    <Typography variant="h6">Recorded Video Preview</Typography>
                    <video
                        controls
                        width={640}
                        height={480}
                        style={{ border: "1px solid #ccc", display: "block", marginTop: 2 }}
                    >
                        <source src={URL.createObjectURL(new Blob(recordedChunks, { type: "video/webm" }))} type="video/webm" />
                    </video>
                </Box>
            )}

            {/* <Button variant='contained' onClick={connectSerial}>Connect Serial Port</Button> */}
        </Box>
    );
};

export default WebRTCSourcesImage;