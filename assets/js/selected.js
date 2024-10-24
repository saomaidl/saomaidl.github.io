import { ref, onValue } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';
import { auth, realTimeDb } from './firebase-config.js';

async function getUserIndexById() {
    try {
        // Lấy thông tin người dùng hiện tại
        const user = auth.currentUser;
        if (!user) {
            console.error("User is not logged in.");
            return -1; // Người dùng chưa đăng nhập
        }

        const userId = user.uid;

        // Tạo tham chiếu đến nhánh 'users' trong Realtime Database
        const usersRef = ref(realTimeDb, 'users');

        // Lắng nghe sự thay đổi của dữ liệu trong nhánh 'users'
        onValue(usersRef, (snapshot) => {
            if (snapshot.exists()) {
                const usersData = snapshot.val();
                
                // Chuyển dữ liệu từ object thành mảng để dễ thao tác
                const usersArray = Object.keys(usersData).map(key => ({
                    uid: key,
                    ...usersData[key]
                }));

                // Lọc những người có played là false
                const filteredUsers = usersArray.filter(user => !user.played);

                // Sắp xếp theo priority và timestamp
                filteredUsers.sort((a, b) => {
                    // Sắp xếp theo priority (true trước)
                    if (a.priority !== b.priority) {
                        return b.priority - a.priority; // true (1) đứng trước false (0)
                    }
                    // Nếu priority giống nhau thì sắp xếp theo timestamp
                    return a.timestamp - b.timestamp;
                });

                // Tìm index của người dùng với id cụ thể
                const userIndex = filteredUsers.findIndex(user => user.uid === userId);

                // Cập nhật giao diện người dùng với vị trí hiện tại
                updateSongStatus(userIndex);
            } else {
                console.error("No users found in the database.");
                updateSongStatus(-1); // Không tìm thấy người dùng
            }
        }, (error) => {
            console.error("Error reading user data:", error);
            updateSongStatus(-1); // Xảy ra lỗi
        });
    } catch (error) {
        console.error("Error getting user data:", error);
        updateSongStatus(-1); // Xảy ra lỗi
    }
}

// Hàm cập nhật giao diện người dùng với index
function updateSongStatus(index) {
    const songStatusElement = document.getElementById('song_status');
    if (index === 0) {
        songStatusElement.innerHTML = `<div><span>BÀI CỦA QUÝ KHÁCH HIỆN ĐANG PHÁT</span></div><div>KÍNH CHÚC QUÝ KHÁCH VUI VẺ</div>`;
    } else if (index === null || index === -1) {
        songStatusElement.innerHTML = `<div><span>QUÝ KHÁCH ĐÃ HÁT XONG</span></div><div>QUÝ KHÁCH HÁT RẤT HAY ĐÓ Ạ!</div>`;
        songStatusElement.style.color = "red";
    } else if (index === 1) {
        songStatusElement.innerHTML = `<div><span>MỜI QUÝ KHÁCH CHUẨN BỊ</span></div><div>SAO MAI LUÔN BÊN QUÝ KHÁCH</div>`;
    } else {
        songStatusElement.innerHTML = `<div><span>CÒN</span><span style="color: rgb(128, 184, 238);">${index}</span><span>BÀI</span></div><div>QUÝ KHÁCH LUÔN SẴN SÀNG NHÉ</div>`;
    }
}
getUserIndexById();
