const video = document.getElementById('video');

async function setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 720, height: 560 }
    });
    video.srcObject = stream;
    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
}

async function loadModels() {
    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    ]);
    console.log("Models Loaded");
}

async function start() {
    await setupCamera();
    await loadModels();
    console.log("Camera and models are ready.");
}

start();

const registerButton = document.getElementById('register');
const nameInput = document.getElementById('name');
const rollnoInput = document.getElementById('rollno');
registerButton.addEventListener('click', async () => {
    const name = nameInput.value;
    const rollno = rollnoInput.value;

    if (!name) {
        alert('Please enter a name');
        return;
    }
    if (!rollno) {
        alert('Please enter a Roll number');
        return;
    }

    const faceDescriptor = await detectFace();
    if (faceDescriptor) {
        const registeredFaces = JSON.parse(localStorage.getItem('registeredFaces')) || [];
        registeredFaces.push({ name: name, rollnumber: rollno, descriptor: Array.from(faceDescriptor) });
        localStorage.setItem('registeredFaces', JSON.stringify(registeredFaces));
        alert('Face registered successfully!');
    }
});

async function detectFace() {
    const options = new faceapi.TinyFaceDetectorOptions();
    const detections = await faceapi.detectSingleFace(video, options).withFaceLandmarks().withFaceDescriptor();

    if (detections) {
        return detections.descriptor;
    }
    alert('No face detected. Please try again.');
    return null;
}

const recognizeButton = document.getElementById('recognize');

recognizeButton.addEventListener('click', async () => {
    const faceDescriptor = await detectFace();
    if (faceDescriptor) {
        const registeredFaces = JSON.parse(localStorage.getItem('registeredFaces')) || [];
        const labeledDescriptors = registeredFaces.map(f => new faceapi.LabeledFaceDescriptors(f.rollnumber, [new Float32Array(f.descriptor)]));
        const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors);

        const bestMatch = faceMatcher.findBestMatch(faceDescriptor);
        if (bestMatch.label !== 'unknown') {
            const matchedFace = registeredFaces.find(f => f.rollnumber === bestMatch.label);
            const remainingTime = canMarkAttendance(matchedFace.rollnumber);
            if (remainingTime <= 0) {
                markAttendance(matchedFace.name, matchedFace.rollnumber);
                alert(`Face recognized! Attendance marked for ${matchedFace.name} (Roll Number: ${matchedFace.rollnumber}).`);
            } else {
                alert(`User ${matchedFace.name} can mark attendance only once per hour. Next attendance can be marked in ${remainingTime} minutes.`);
            }
        } else {
            alert('Face not recognized.');
        }
    }
});

function canMarkAttendance(rollnumber) {
    const lastAttendanceTime = localStorage.getItem(`lastAttendance_${rollnumber}`);
   console.log(lastAttendanceTime);
    const currentHourStart = new Date();
    currentHourStart.setMinutes(0);
    currentHourStart.setSeconds(0);
    currentHourStart.setMilliseconds(0);
    const currentTime = new Date().toLocaleTimeString('en-IN');
    const currentHour = currentTime[0];
    console.log("currenthour123")
    console.log(currentHour);

    //if (!lastAttendanceTime || new Date(lastAttendanceTime) < currentHourStart) {
      //  return 0; // No previous attendance or last attendance was in a different hour
    //} else {
    //    const nextAttendanceTime = new Date(lastAttendanceTime).toLocaleTimeString('en-IN');
     //   const nextAttendanceHour =nextAttendanceTime[0];
        //nextAttendanceTime.setHours(nextAttendanceTime.getHours() + 1);
        //const remainingTime = Math.ceil((nextAttendanceTime.getTime() - new Date().getTime()) / (1000 * 60)); // Remaining minutes until next hour
     //   
      //  return remainingTime >= 0 ? remainingTime : 0;
    //}


    const nextAttendanceTime = new Date(lastAttendanceTime).toLocaleTimeString('en-IN');
    if( currentTime[1] == ":"){


        console.log(currentTime);
            const nextAttendanceMin = currentTime.slice(2,4);
            const remainingTime = 60 - nextAttendanceMin;
            
            return remainingTime;



        }
        else {
            
                        const nextAttendanceMin = nextAttendanceTime.slice(3,5);
                        const remainingTime = 60 - nextAttendanceMin;
            


                        return remainingTime;

           
        }



   
}

function markAttendance(name, rollnumber) {
    const attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
    const date = new Date().toLocaleDateString('en-IN');
    const time = new Date().toLocaleTimeString('en-IN');
    attendanceRecords.push({ name: name, rollnumber: rollnumber, date: date, time: time });
    localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));

    // Update last attendance time
    localStorage.setItem(`lastAttendance_${rollnumber}`, new Date().toISOString());
}

const exportButton = document.getElementById('export');

exportButton.addEventListener('click', () => {
    const attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
    const csvContent = "data:text/csv;charset=utf-8,"
        + ["Name,Roll Number,Date,Time"].concat(attendanceRecords.map(record => `${record.name},${record.rollnumber},${record.date},${record.time}`)).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "attendance.csv");
    document.body.appendChild(link);
    link.click();
});

const displayRegisteredButton = document.getElementById('displayRegistered');
const displayAttendanceButton = document.getElementById('displayAttendance');

displayRegisteredButton.addEventListener('click', () => {
    const registeredFaces = JSON.parse(localStorage.getItem('registeredFaces')) || [];
    console.log(registeredFaces);
    displayTable(registeredFaces, 'registeredTableContainer', ['Name', 'Roll Number', 'Descriptor']);
});

displayAttendanceButton.addEventListener('click', () => {
    const attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
    displayTable(attendanceRecords, 'attendanceTableContainer', ['Name', 'Roll Number', 'Date', 'Time']);
});

function displayTable(data, containerId, headers) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = `<p class="text-gray-500">No data available</p>`;
        return;
    }

    const table = document.createElement('table');
    table.className = 'min-w-full bg-white';

    const thead = document.createElement('thead');
    thead.innerHTML = `<tr>${headers.map(header => `<th class="py-2 px-4 bg-gray-200">${header}</th>`).join('')}</tr>`;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = headers.map(header => {
            const key = header.toLowerCase().replace(/ /g, '');
            if (key === 'descriptor') {
                return `<td class="border px-4 py-2">${item.descriptor.slice(0, 5).join(', ')}...</td>`;
            }
            return `<td class="border px-4 py-2">${item[key]}</td>`;
        }).join('');
        tbody.appendChild(row);
    });
    table.appendChild(tbody);

    container.appendChild(table);
}
