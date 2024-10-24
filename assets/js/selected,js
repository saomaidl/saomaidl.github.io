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

        const userId = user.uid; // Lấy id của người dùng hiện tại

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
    if (index !== -1) {
        console.log(`User index: ${index}`);
    } else {
        console.log("User not found or an error occurred.");
    }
});
