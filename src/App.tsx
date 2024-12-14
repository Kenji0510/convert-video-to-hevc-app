import React, { useState, useRef, useEffect} from 'react';
import './App.css';

interface RequestData {
  file_name: string;
  video_quality_number: number;
  video_data: string;
}

interface ResponseData {
  status: string;
  message: string;
}

interface VideoQuality {
  quality_number: number;
  quality_name: string;
}

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>("");
  const [videoQuality] = useState<VideoQuality[]>([
    { quality_number: 0, quality_name: "Low" },
    { quality_number: 1, quality_name: "Medium" },
    { quality_number: 2, quality_name: "High" },
  ]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isListOpen, setIsListOpen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const initializeWebSocket = () => {
    if (!wsRef.current) {
      const ws = new WebSocket("ws://192.168.0.26:8080/ws");
      //const ws = new WebSocket("ws://192.168.0.4:8080/ws");
      ws.onopen = () => {
        console.log("WebSocket connected");
        setUploadStatus("WebSocket connected");
      };
      ws.onclose = () => {
        console.log("WebSocket disconnected");
        setUploadStatus("WebSocket disconnected");
      };
      ws.onerror = (error) => {
        console.error("WebSocket error: ", error);
        setUploadStatus("WebSocket error");
      };
      ws.onmessage = (message) => {
        if (typeof message.data === "string") {
          try {
            const response: ResponseData = JSON.parse(message.data);
            console.log("Received message: ", response.message);

            if (response.status === "success") {
              setUploadStatus(response.message);
            }
          } catch (error) {
            console.error("Error parsing message: ", error);
          }
        } else if (message.data instanceof Blob) {
          console.log("Received video data as Blob");
          const url = URL.createObjectURL(message.data);
          setDownloadUrl(url);
          setUploadStatus("Video received and ready to download");
        }
      };
      wsRef.current = ws;
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const fileName = file.name.toLowerCase();
      const validExtensions = ['mp4', 'm4v'];
      const fileExtension = fileName.substring(fileName.lastIndexOf('.') + 1);

      if (validExtensions.includes(fileExtension)) {
        console.log("Selected file: ", file);
        setSelectedFile(file);
      } else {
        alert("Please select a valid image file");
        setSelectedFile(null);
      }
    }
  };

  const handleFileUpload = () => {
    if (!selectedFile) {
      alert("Please select a file to upload");
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const reader = new FileReader();
      const requestData: RequestData = {
        file_name: selectedFile.name,
        video_quality_number: selectedIndex,
        video_data: "",
      };

      reader.readAsDataURL(selectedFile);
      reader.onload = () => {
        if (reader.result && typeof reader.result === "string") {
          requestData.video_data = reader.result;
          wsRef.current?.send(JSON.stringify(requestData));
          console.log("File sent via WebSocket");
          setUploadStatus("File sent via WebSocket");
        }
      };
    } else {
      alert("WebSocket is not connected");
    }
  };

  const toggleList = () => {
    setIsListOpen(!isListOpen);
  }

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    setIsListOpen(false);
    console.log("Selected index: ", index);
  };

  useEffect(() => {
    initializeWebSocket();
    return () => {
    };
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h2>Convert your .mp4 video to HEVC(.mp4)!</h2>
        <img src="h264toh265.png" className="image" alt="logo" />
        <input type='file' accept="video/mp4" onChange={handleFileChange} />
        {isListOpen && (
          <ul style={{ listStyleType: 'none', padding: 0}}>
            {videoQuality.map((item, index) => (
              <li key={index} onClick={() => handleSelect(index)} style={{ padding: "1px", backgroundColor: "lightgreen", margin: "2px 0", cursor: "pointer"}} >
                {item.quality_name}
              </li>
            ))}
          </ul>
        )}
        <button onClick={toggleList} style={{ marginTop: "10px"}}>
          {isListOpen ? "Close List" : "Select Video Quality"}
        </button>

        {selectedIndex !== null && (
          <p style={{ color: 'yellow' }}>Selected Video Quality: {videoQuality[selectedIndex].quality_name}</p>
        )}

        <button onClick={handleFileUpload}>Upload</button>
        <p>Status: {uploadStatus}</p>
        {downloadUrl && (
          <div>
            <p style={{ color: 'green' }}>Download the converted video:</p>
            <a style={{ color: 'yellow' }} href={downloadUrl} download="converted_video.mp4">Download Video</a>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
