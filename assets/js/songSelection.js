import { auth, realTimeDb } from './firebase-config.js';
import { ref, set, push, get } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';

async function handleSongSelection(videoId, title, thumbnail, viewCount, duration, channelThumbnailUrl, channelTitle, publishedAt, channelId) {
    const user = auth.currentUser;

    // Tạo tham chiếu đến Realtime Database
    const userRef = ref(realTimeDb, `users/${user.uid}`);

    // Lấy thông tin người dùng hiện tại
    const snapshot = await get(userRef);
    
    if (snapshot.exists() && snapshot.val().songSelected) {
        loadSelectedFile();
        return;
    }

    try {
        // Đặt thông tin bài hát được chọn
        await set(userRef, {
            songSelected: true,
            videoId: videoId,
            songName: title,
            thumbnail: thumbnail,
            viewCount: viewCount,
            duration: duration,
            channelThumbnailUrl: channelThumbnailUrl,
            channelTitle: channelTitle,
            publishedAt: publishedAt,
            channelId: channelId,
            timestamp: Date.now() // Thêm timestamp
        });

        // Tạo tham chiếu đến nhánh users
        const usersRef = ref(realTimeDb, 'users'); // Tham chiếu đến nhánh users
        const newUserRef = push(usersRef); // Tạo một key mới tự động

        // Lưu thông tin với id tự động, played, và priority
        await set(newUserRef, {
            timestamp: Date.now(),
            id: newUserRef.key, // Thêm trường id với giá trị là key tự động
            played: false,
            priority: false
        });

        loadSelectedFile();
    } catch (error) {
        console.error("Error saving song: ", error);
    }
}

async function loadSelectedFile() {
    const user = auth.currentUser;
    const userRef = ref(realTimeDb, `users/${user.uid}`);
    const snapshot = await get(userRef);

    if (snapshot.exists() && snapshot.val().songSelected) {
        $('#content').load('/assets/html/selected.html', function(response, status, xhr) {
            if (status === "error") {
                console.error("Không thể tải tệp selected.html:", xhr.status, xhr.statusText);
            } else {
                $('body').css('overflow', 'hidden');
            }
        });
    }
}

$(document).on('click', '#playlist', function() {
    const videoId = $(this).data('video-id');
    const title = $(this).data('video-title');
    const thumbnail = $(this).data('thumbnail');
    const viewCount = $(this).data('viewCount');
    const duration = $(this).data('duration');
    const channelThumbnailUrl = $(this).data('channelThumbnailUrl');
    const channelTitle = $(this).data('channelTitle');
    const publishedAt = $(this).data('publishedAt');
    const channelId = $(this).data('channelId');

    handleSongSelection(videoId, title, thumbnail, viewCount, duration, channelThumbnailUrl, channelTitle, publishedAt, channelId);
});
