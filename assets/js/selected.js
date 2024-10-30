import { ref, onValue } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';
import { auth, realTimeDb } from './firebase-config.js';

async function getUserIndexById() {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.error("User is not logged in.");
            return;
        }

        const userId = user.uid;
        const usersRef = ref(realTimeDb, 'users');
        
        let lastDataSnapshot = null; // Biến lưu trữ dữ liệu cuối cùng để so sánh

        onValue(usersRef, (snapshot) => {
            if (!snapshot.exists()) {
                console.error("No users found in the database.");
                updateSongStatus(-1);
                return;
            }

            const usersData = snapshot.val();
            
            // Kiểm tra nếu dữ liệu không thay đổi, bỏ qua cập nhật
            if (JSON.stringify(usersData) === JSON.stringify(lastDataSnapshot)) {
                return; // Dữ liệu không thay đổi, bỏ qua
            }
            
            // Cập nhật dữ liệu cuối cùng
            lastDataSnapshot = usersData;

            // Xử lý dữ liệu
            const userIndex = processUserData(usersData, userId);
            updateSongStatus(userIndex);
        }, (error) => {
            console.error("Error reading user data:", error);
            updateSongStatus(-1);
        });
    } catch (error) {
        console.error("Error getting user data:", error);
        updateSongStatus(-1);
    }
}

function processUserData(usersData, userId) {
    // Chuyển dữ liệu từ object thành mảng để dễ thao tác
    const usersArray = Object.keys(usersData).map(key => ({
        uid: key,
        ...usersData[key]
    }));

    // Lọc những người có played là false
    const filteredUsers = usersArray.filter(user => !user.played);

    // Sắp xếp theo priority và timestamp
    filteredUsers.sort((a, b) => {
        if (a.priority !== b.priority) {
            return b.priority - a.priority; // true (1) đứng trước false (0)
        }
        return a.timestamp - b.timestamp;
    });

    // Tìm index của người dùng với id cụ thể
    return filteredUsers.findIndex(user => user.uid === userId);
}

// Hàm cập nhật giao diện người dùng với index
function updateSongStatus(index) {
    const songStatusElement = document.getElementById('song_status');
    if (index === 0) {
        songStatusElement.innerHTML = `<div class="flex gap-[4px] items-center justify-center flex-col text-[rgb(128,184,238)]"><span>Bài hát của quý khách đang phát!</span></div>`;
    } else if (index === null || index === -1) {
        songStatusElement.innerHTML = `<div class="flex gap-[4px] items-center justify-center flex-col text-[rgb(128,184,238)]"><span>Quý khách đã hoàn thành.</span><span>Trân trọng cảm ơn!</span></div>`;
    } else if (index === 1) {
        songStatusElement.innerHTML = `<div class="flex gap-[4px] items-center justify-center flex-col text-[rgb(128,184,238)]"><span>Sắp đến lượt quý khách.</span><span>Xin hãy chuẩn bị!</span></div>`;
    } else {
        songStatusElement.innerHTML = `<div class="flex gap-[4px] items-center justify-center flex-col text-[rgb(128,184,238)]"><span>Chỉ còn ${index} bài nữa.</span><span>Vui lòng chờ trong giây lát!</span></div>`;
    }
}

getUserIndexById();
