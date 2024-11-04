import { auth, db } from './firebase-config.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { getDatabase, ref, set } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

// Kiểm tra xem người dùng đã chọn bài hát chưa
async function checkUserSongSelection(userId) {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.exists() && userDoc.data().songSelected;
}

// Lưu thông tin bài hát vào Firestore
async function saveSongToFirestore(userId, songData) {
    await setDoc(doc(db, 'users', userId), { ...songData, songSelected: true }, { merge: true });
}

// Lưu thông tin vào Realtime Database
async function saveSongToRealtimeDb(userId) {
    const dbRef = ref(getDatabase(), `users/${userId}`);
    await set(dbRef, {
        timestamp: Date.now(),
        played: false,
        select: false,
        priority: false
    });
}

// Tải giao diện bài hát đã chọn
function loadSelectedFile() {
    $('#content').load('/assets/html/selected.html', function(response, status, xhr) {
        if (status === "error") {
            console.error("Không thể tải tệp selected.html:", xhr.status, xhr.statusText);
        } else {
            $('body').css('overflow', 'hidden');
        }
    });
}

// Hàm xử lý chọn bài hát
async function handleSongSelection(songData) {
    const user = auth.currentUser;
    if (!user) return; // Thoát nếu không có người dùng

    const songSelected = await checkUserSongSelection(user.uid);
    if (songSelected) {
        loadSelectedFile();
        return;
    }

    try {
        await saveSongToFirestore(user.uid, songData);
        await saveSongToRealtimeDb(user.uid);
        loadSelectedFile();
    } catch (error) {
        console.error("Error saving song: ", error);
    }
}

// Đăng ký observer để theo dõi trạng thái đăng nhập
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User is logged in:", user.uid);
        
        // Lắng nghe sự kiện khi người dùng chọn bài hát
        $(document).on('click', '#playlist', function() {
            const songData = {
                videoId: $(this).data('video-id'),
                songName: $(this).data('video-title'),
                thumbnail: $(this).data('thumbnail'),
                viewCount: $(this).data('viewCount'),
                duration: $(this).data('duration'),
                channelThumbnailUrl: $(this).data('channelThumbnailUrl'),
                channelTitle: $(this).data('channelTitle'),
                publishedAt: $(this).data('publishedAt'),
                channelId: $(this).data('channelId')
            };

            // Gọi hàm xử lý khi chọn bài hát
            handleSongSelection(songData);
        });
    } else {
        console.log("No user is logged in.");
    }
});
