const video = document.getElementById('webcam');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const faceCountLabel = document.getElementById('faceCount');
const chartCtx = document.getElementById('emotionChart').getContext('2d');

// define color for each emotion
const emotionColors = {
    happy: '#28a745',       // green
    sad: '#007bff',         // blue
    angry: '#dc3545',       // red
    surprised: '#ffc107',   // yellow
    fearful: '#6f42c1',     // purple
    disgusted: '#fd7e14',   // orange
    neutral: '#6c757d'      // gray
};
const emotionsList = Object.keys(emotionColors);

// load models
async function loadModels() {
    await faceapi.nets.tinyFaceDetector.loadFromUri('models'); //detect faces
    await faceapi.nets.faceExpressionNet.loadFromUri('models'); //detect emotion
    console.log('Models loaded');
}

// start webcam
async function startWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        video.srcObject = stream;
    } catch (err) {
        console.error('Error accessing webcam: ', err);
    }
}

const emotionChart = new Chart(chartCtx, {
    type: 'pie',
    data: {
        labels: emotionsList,
        datasets: [{
            label: 'Emotion Distribution (%)',
            data: emotionsList.map(() => 0), // initial values
            backgroundColor: emotionsList.map(e => emotionColors[e]),
        }]
    },
    options: {
        responsive: true,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    color: '#ffffff',
                }
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        return `${context.label}: ${context.parsed}%`;
                    }
                }
            }
        }
    }
});


// detect emotions
function detectEmotions() {
    video.addEventListener('play', () => {
        // adjust size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const interval = setInterval(async () => {
            if (video.paused || video.ended) {
                clearInterval(interval);
                return;
            }

            // detect faces + emotions
            const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();
            faceCountLabel.textContent = detections.length; // count faces

            // clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Aggregate emotions for chart
            const aggregatedEmotions = {};
            emotionsList.forEach(emo => aggregatedEmotions[emo] = 0);

            detections.forEach(detect => {
                const { x, y, width, height } = detect.detection.box;
                const emotions = detect.expressions;
                const maxEmotion = Object.keys(emotions).reduce((a, b) => emotions[a] > emotions[b] ? a : b);
                const color = emotionColors[maxEmotion] || '#ff0000';

                // draw bounding box
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.strokeRect(x, y, width, height);

                // draw emotion label
                ctx.fillStyle = color;
                ctx.font = '16px Arial';
                ctx.fillText(`${maxEmotion} (${(emotions[maxEmotion] * 100).toFixed(0)}%)`, x, y - 5);

                // Aggregate for chart
                emotionsList.forEach(emo => aggregatedEmotions[emo] += emotions[emo]);
            });
            // Update chart with average percentages
            const faceCount = detections.length || 1; // avoid division by zero
            emotionChart.data.datasets[0].data = emotionsList.map(e => ((aggregatedEmotions[e] / faceCount) * 100).toFixed(0));
            emotionChart.update();
        }, 200); // every 200ms
    });
}

loadModels().then(() => {
    startWebcam();
    detectEmotions();
});