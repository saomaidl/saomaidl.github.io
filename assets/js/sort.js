import { ref, onValue } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';
import { auth, realTimeDb } from './firebase-config.js';
import { onAuthStateChanged, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

// Thiết lập phiên đăng nhập vĩnh viễn
setPersistence(auth, browserLocalPersistence)
    .then(() => {
        // Lắng nghe thay đổi trạng thái đăng nhập
        onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log("User is logged in:", user.uid);
                // Nếu người dùng đã đăng nhập, gọi hàm để lấy danh sách người dùng và index
                getAllUserIndexes();
            } else {
                console.error("User is not logged in. Redirecting to login page.");
                window.location.href = "/search"; // Chuyển hướng tới trang đăng nhập nếu chưa đăng nhập
            }
        });
    })
    .catch((error) => {
        console.error("Error setting persistence:", error);
    });

async function getAllUserIndexes() {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.error("User is not logged in.");
            return;
        }

        const userId = user.uid;
        const usersRef = ref(realTimeDb, 'users');
        
        onValue(usersRef, (snapshot) => {
            if (!snapshot.exists()) {
                console.error("No users found in the database.");
                return;
            }

            const usersData = snapshot.val();
            const userIndexes = processAllUserData(usersData, userId);

            // Console log toàn bộ danh sách người dùng với index tương ứng
            console.log("Danh sách người dùng và index tương ứng:");
            userIndexes.forEach(user => {
                console.log(`User ID: ${user.uid}, Index: ${user.index}, Priority: ${user.priority}, Timestamp: ${user.timestamp}`);
            });
        }, (error) => {
            console.error("Error reading user data:", error);
        });
    } catch (error) {
        console.error("Error getting user data:", error);
    }
}

function processAllUserData(usersData, currentUserId) {
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
            return b.priority - a.priority;
        }
        return a.timestamp - b.timestamp;
    });

    // Gắn `index` cho mỗi người dùng trong danh sách đã sắp xếp
    return filteredUsers.map((user, index) => ({
        ...user,
        index: index, // Thêm trường index cho mỗi người dùng
        isCurrentUser: user.uid === currentUserId // Xác định nếu là người dùng hiện tại
    }));
}

// Không gọi getAllUserIndexes() ở đây, sẽ được gọi trong onAuthStateChanged
