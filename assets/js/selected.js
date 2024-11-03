import { ref, onValue } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';
import { auth, realTimeDb } from './firebase-config.js';

async function getUserIndexById() {
    try {
        const user = auth.currentUser;
        if (!user) {
            return;
        }

        const userId = user.uid;
        const usersRef = ref(realTimeDb, 'users');
        
        let lastDataSnapshot = null;

        onValue(usersRef, (snapshot) => {
            if (!snapshot.exists()) {
                updateSongStatus(-1);
                return;
            }

            const usersData = snapshot.val();
            if (JSON.stringify(usersData) === JSON.stringify(lastDataSnapshot)) {
                return;
            }
            lastDataSnapshot = usersData;
            const userIndex = processUserData(usersData, userId);
            updateSongStatus(userIndex);
        }, (error) => {
            updateSongStatus(-1);
        });
    } catch (error) {
        updateSongStatus(-1);
    }
}

function processUserData(usersData, userId) {
    const usersArray = Object.keys(usersData).map(key => ({
        uid: key,
        ...usersData[key]
    }));
    const filteredUsers = usersArray.filter(user => !user.played);
    filteredUsers.sort((a, b) => {
        if (a.priority !== b.priority) {
            return b.priority - a.priority;
        }
        return a.timestamp - b.timestamp;
    });
    return filteredUsers.findIndex(user => user.uid === userId);
}

function updateSongStatus(index) {
    const songStatusElement = document.getElementById('song_status');
    if (index === 0) {
        songStatusElement.innerHTML = `<div class="flex gap-[4px] items-center justify-center flex-col text-[rgb(128,184,238)]"><span>Ca khúc của quý khách đang phát!</span></div>`;
    } else if (index === null || index === -1) {
        songStatusElement.innerHTML = `<div class="flex gap-[4px] items-center justify-center flex-col text-[rgb(128,184,238)]"><span>Quý khách đã hoàn thành.</span><span>Trân trọng cảm ơn!</span></div>`;
    } else if (index === 1) {
        songStatusElement.innerHTML = `<div class="flex gap-[4px] items-center justify-center flex-col text-[rgb(128,184,238)]"><span>Sắp đến lượt quý khách.</span><span>Xin hãy chuẩn bị!</span></div>`;
    } else {
        songStatusElement.innerHTML = `<div class="flex gap-[4px] items-center justify-center flex-col text-[rgb(128,184,238)]"><span>Chỉ còn ${index} ca khúc.</span><span>Vui lòng chờ trong giây lát!</span></div>`;
    }
}

getUserIndexById();
