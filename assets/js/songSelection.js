import { auth, db, realTimeDb } from './firebase-config.js';
import { doc, getDoc, setDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { ref, set, onValue } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

function getCurrentUser() {
    return auth.currentUser;
}

async function checkUserSongSelection(userId) {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.exists() && userDoc.data().songSelected;
}

async function saveSongToFirestore(userId, songData) {
    await setDoc(doc(db, 'users', userId), { ...songData, songSelected: true }, { merge: true });
}

async function saveSongToRealtimeDb(userId) {
    const dbRef = ref(realTimeDb, `users/${userId}`);
    await set(dbRef, {
        timestamp: Date.now(),
        played: false,
        select: false,
        priority: false
    });
}

function loadSelectedFile() {
    $('#content').load('/assets/html/selected.html', function(response, status, xhr) {
        if (status === "success") {
            $('body').css('overflow', 'hidden');
        }
    });
}

async function handleSongSelection(songData) {
    const user = getCurrentUser();
    if (!user) return;

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

async function getUserIndexById() {
    const user = getCurrentUser();
    if (!user) {
        console.log('Không có người dùng hiện tại.');
        return;
    }

    const userId = user.uid;
    const usersRef = ref(realTimeDb, 'users');

    let lastDataSnapshot = null;
    const userDocRef = doc(db, 'users', userId);
    console.log(`Theo dõi tài liệu người dùng: ${userId}`);
    
    onSnapshot(userDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
            const userData = docSnapshot.data();
            console.log('Dữ liệu người dùng:', userData);
            
            if (userData.songSelected) {
                console.log('Người dùng đã chọn bài hát.');
                onValue(usersRef, (snapshot) => {
                    if (!snapshot.exists()) {
                        console.log('Không có dữ liệu người dùng.');
                        $('#song_status').trigger('updateStatus', [-1]);
                        return;
                    }
                    
                    const usersData = snapshot.val();
                    console.log('Dữ liệu người dùng từ Realtime Database:', usersData);
                    
                    if (JSON.stringify(usersData) === JSON.stringify(lastDataSnapshot)) {
                        console.log('Dữ liệu người dùng không thay đổi.');
                        return;
                    }
                    
                    lastDataSnapshot = usersData;
                    const userIndex = processUserData(usersData, userId);
                    console.log(`Chỉ số người dùng: ${userIndex}`);
                    $('#song_status').trigger('updateStatus', [userIndex]);
                }, (error) => {
                    console.error('Lỗi khi lấy dữ liệu người dùng:', error);
                    $('#song_status').trigger('updateStatus', [-1]);
                });
            } else {
                console.log('Người dùng chưa chọn bài hát.');
                $('#song_status').trigger('updateStatus', [-1]);
            }
        } else {
            console.log('Tài liệu người dùng không tồn tại.');
            $('#song_status').trigger('updateStatus', [-1]);
        }
    });
}

function processUserData(usersData, userId) {
    const usersArray = Object.keys(usersData).map(key => ({
        uid: key,
        ...usersData[key]
    }));
    
    const filteredUsers = usersArray.filter(user => !user.played);

    filteredUsers.sort((a, b) => {
        const selectA = Number(a.select === true);
        const selectB = Number(b.select === true);
        if (selectA !== selectB) {
            return selectB - selectA;
        }

        const priorityA = Number(a.priority === true);
        const priorityB = Number(b.priority === true);
        if (priorityA !== priorityB) {
            return priorityB - priorityA;
        }

        return a.timestamp - b.timestamp;
    });

    return filteredUsers.findIndex(user => user.uid === userId);
}

function updateSongStatus(index) {
    const songStatusElement = $('#song_status');
    if (!songStatusElement.length) return;
    let message = '';
    if (index === 0) {
        message = 'Ca khúc của quý khách đang phát.';
    } else if (index === null || index === -1) {
        $('#content').empty();
        $('body').removeAttr('style');
    } else if (index === 1) {
        message = 'Chuẩn bị đến lượt quý khách.<br>Hãy sẵn sàng!';
    } else {
        message = `Chỉ còn ${index} ca khúc.`;
    }

    if (message) {
        songStatusElement.html(`<div class="flex gap-[4px] items-center justify-center flex-col text-[rgb(128,184,238)]"><span>${message}</span></div>`);
    }
}

$('#song_status').on('updateStatus', function(event, index) {
    updateSongStatus(index);
});

onAuthStateChanged(auth, (user) => {
    if (user) {
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

            handleSongSelection(songData);
        });
    }
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        getUserIndexById();
    }
});
