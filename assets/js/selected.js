import { ref, get } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';
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

        // Lấy dữ liệu từ Realtime Database
        const usersRef = ref(realTimeDb, 'users');
        const snapshot = await get(usersRef);

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

            // Trả về index (vị trí) của người dùng
            return userIndex;
        } else {
            console.error("No users found in the database.");
            return -1; // Không tìm thấy người dùng
        }
    } catch (error) {
        console.error("Error getting user data:", error);
        return -1; // Xảy ra lỗi
    }
}

// Gọi hàm để lấy index của người dùng hiện tại
getUserIndexById().then(index => {
    const songStatusElement = document.getElementById('song_status'); // Lấy thẻ span có id là "song_status"
    songStatusElement.style.color = "rgb(128, 184, 238)"; // Đặt màu mặc định
    
    if (index === 0) {
        // Nếu còn 0 bài thì hiển thị "BÀI CỦA BẠN ĐANG PHÁT" và "ĐANG PHÁT"
        songStatusElement.innerHTML = `<span>ĐANG PHÁT</span>`;
    } else if (index === null || index === -1) {
        // Nếu không tìm thấy hoặc lỗi, hiển thị "ĐÃ HÁT"
        songStatusElement.innerHTML = `<span>ĐÃ HÁT</span>`;
        songStatusElement.style.color = "red"; // Đổi màu chữ sang đỏ khi có lỗi
    } else if (index === 1) {
        // Nếu còn 1 bài thì hiển thị "ĐANG CÒN", số lượng bài và "BÀI"
        songStatusElement.innerHTML = `<span>MỜI QUÝ KHÁCH CHUẨN BỊ</span>`;
    } else {
        // Nếu còn nhiều hơn 1 bài, hiển thị số lượng bài còn lại
        songStatusElement.innerHTML = `
            <span>CÒN</span>
            <span style="color: rgb(128, 184, 238);">${index}</span>
            <span>BÀI</span>`;
    }
});
