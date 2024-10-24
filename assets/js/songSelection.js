import { auth, db, realTimeDb } from './firebase-config.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { getDatabase, ref, set } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';

async function handleSongSelection(videoId, title, thumbnail, viewCount, duration, channelThumbnailUrl, channelTitle, publishedAt, channelId) {
    const user = auth.currentUser;
    const userDoc = await getDoc(doc(db, 'users', user.uid));

    // Kiểm tra xem người dùng đã chọn bài hát chưa
    if (userDoc.exists() && userDoc.data().songSelected) {
        loadSelectedFile(); // Nếu đã chọn, tải file bài hát đã chọn
        return;
    }

    try {
        // Lưu thông tin bài hát vào Firestore
        await setDoc(doc(db, 'users', user.uid), {
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
        }, { merge: true });

        // Lưu các thông tin cần thiết vào Realtime Database
        const dbRef = ref(getDatabase(), `users/${user.uid}`);
        await set(dbRef, {
            timestamp: Date.now(), // Lưu timestamp hiện tại
            played: false,         // Ban đầu chưa phát
            priority: false        // Ban đầu priority là false
        });

        loadSelectedFile(); // Sau khi lưu, tải file đã chọn
    } catch (error) {
        console.error("Error saving song: ", error);
    }
}

async function loadSelectedFile() {
    const user = auth.currentUser;
    const userDoc = await getDoc(doc(db, 'users', user.uid));

    if (userDoc.exists() && userDoc.data().songSelected) {
        // Tải giao diện cho bài hát đã chọn
        $('#content').load('/assets/html/selected.html', function(response, status, xhr) {
            if (status === "error") {
                console.error("Không thể tải tệp selected.html:", xhr.status, xhr.statusText);
            } else {
                $('body').css('overflow', 'hidden'); // Ẩn scroll khi tải xong
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

    // Gọi hàm xử lý khi chọn bài hát
    handleSongSelection(videoId, title, thumbnail, viewCount, duration, channelThumbnailUrl, channelTitle, publishedAt, channelId);
});
