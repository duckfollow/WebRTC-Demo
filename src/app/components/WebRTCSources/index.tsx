"use client";

import React, { useState, useEffect, useRef } from "react";
import { Box, Typography, MenuItem, Select, FormControl, InputLabel } from "@mui/material";

type MediaDevice = MediaDeviceInfo;

const WebRTCSources: React.FC = () => {
    const [videoDevices, setVideoDevices] = useState<MediaDevice[]>([]);
    const [audioDevices, setAudioDevices] = useState<MediaDevice[]>([]);
    const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
    const [capturedImages, setCapturedImages] = useState<string[]>([]);  // Store captured images as base64 strings
    const [noMotionDetected, setNoMotionDetected] = useState(false);

    const videoSelectRef = useRef<HTMLSelectElement | null>(null);
    const audioSelectRef = useRef<HTMLSelectElement | null>(null);
    const videoOutputRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const lastImageRef = useRef<HTMLImageElement | null>(null);

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

        getDevices();
    }, []);

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

            const constraints: MediaStreamConstraints = {
                video: videoDeviceId
                    ? { deviceId: { exact: videoDeviceId } }
                    : true,
                // audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            if (videoOutputRef.current) {
                videoOutputRef.current.srcObject = stream;
            }
            setCurrentStream(stream);

            detectMotion();
        } catch (error) {
            console.error("Error accessing media devices:", error);
        }
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
                    } else if (Date.now() - motionDetectedAt >  1000 && oneShot) {
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
                console.log("check image unique", isImagesEqual(newImageData, previousImageData))
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

    return (
        <Box sx={{ padding: 2 }}>
            <Typography variant="h4" gutterBottom>
                WebRTC: Select Video & Audio Sources
            </Typography>

            <FormControl fullWidth margin="normal">
                <InputLabel id="video-select-label">Select Video Source</InputLabel>
                <Select
                    labelId="video-select-label"
                    inputRef={videoSelectRef}
                    onChange={() =>
                        startStream(
                            videoSelectRef.current?.value || "",
                            audioSelectRef.current?.value || ""
                        )
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

            {/* <FormControl fullWidth margin="normal">
                <InputLabel id="audio-select-label">Select Audio Source</InputLabel>
                <Select
                    labelId="audio-select-label"
                    inputRef={audioSelectRef}
                    onChange={() =>
                        startStream(
                            videoSelectRef.current?.value || "",
                            audioSelectRef.current?.value || ""
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
            </FormControl> */}

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
        </Box>
    );
};

export default WebRTCSources;