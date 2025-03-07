"use client";

import React, { useState, useEffect, useRef } from "react";
import { Box, Typography, MenuItem, Select, FormControl, InputLabel, Button } from "@mui/material";

type MediaDevice = MediaDeviceInfo;

const WebRTCSourcesSound: React.FC = () => {
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

    const [listDevices, setListDevices] = useState<any>()

    useEffect(() => {
        const getDevices = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                setListDevices(devices)
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

            const constraints: MediaStreamConstraints = {
                video: {
                    deviceId: videoDeviceId ? { exact: videoDeviceId } : undefined,
                    width: { ideal: 2560 },
                    height: { ideal: 1440 }
                },
                // audio: true,
                audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            if (videoOutputRef.current) {
                videoOutputRef.current.srcObject = stream;
            }
            setCurrentStream(stream);
            setupAudioAnalyser(stream);

            // detectMotion();
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
            } else if (average <= 0) {
                oneShot = true;
            }

            console.log(oneShot, average)

            requestAnimationFrame(monitorAudioLevel);
        };

        monitorAudioLevel();
    };

    const captureImage = () => {
        if (!videoOutputRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        // Draw current video frame to canvas
        context?.drawImage(videoOutputRef.current, 0, 0, canvas.width, canvas.height);

        const imageDataUrl = canvas.toDataURL("image/png");

        setCapturedImages((prevImages) => [...prevImages, imageDataUrl]);

        // Play sound after capturing image
        const captureSound = new Audio("/iphone-camera-capture-6448.mp3"); // Ensure the file path is correct
        captureSound.play();
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

    return (
        <Box sx={{ padding: 2 }}>
            <Typography variant="h4" gutterBottom>
                WebRTC Sound Detect: Select Video & Audio Sources
            </Typography>

            <FormControl fullWidth margin="normal">
                <InputLabel id="video-select-label">Select Video Source</InputLabel>
                <Select
                    labelId="video-select-label"
                    inputRef={videoSelectRef}
                    onChange={(event) => {
                        const deviceId = event.target.value
                        const groupId = listDevices.find((e: any) => e.deviceId === deviceId)?.groupId
                        const audioDevice = listDevices.find((e: any) => e.groupId === groupId && e.kind === "audioinput")?.deviceId
                        console.log("audioDevice", audioDevice)
                        startStream(
                            deviceId || "",
                            audioDevice || ""
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

export default WebRTCSourcesSound;