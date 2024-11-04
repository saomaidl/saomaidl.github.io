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
    if (!user) return;

    const userId = user.uid;
    const usersRef = ref(realTimeDb, 'users');

    let lastDataSnapshot = null;
    const userDocRef = doc(db, 'users', userId);
    onSnapshot(userDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
            const userData = docSnapshot.data();
            if (userData.songSelected) {
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
            } else {
                updateSongStatus(-1);
            }
        } else {
            updateSongStatus(-1);
        }
    });
}

function processUserData(usersData, userId) {
    const usersArray = Object.keys(usersData).map(key => ({
        uid: key,
        ...usersData[key]
    }));

    usersArray.sort((a, b) => {
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

    return usersArray.findIndex(user => user.uid === userId);
}

function updateSongStatus(index) {
    const songStatusElement = document.getElementById('song_status');
    if (!songStatusElement) return;

    if (index === 0) {
        songStatusElement.innerHTML = `<div class="flex gap-[4px] items-center justify-center flex-col text-[rgb(128,184,238)]"><span>Ca khúc của quý khách đang phát.</span></div>`;
    } else if (index === null || index === -1) {
        songStatusElement.innerHTML = `<div class="flex gap-[4px] items-center justify-center flex-col text-[rgb(128,184,238)]"><span>Chưa có ca khúc nào được phát.</span></div>`;
    } else if (index === 1) {
        songStatusElement.innerHTML = `<div class="flex gap-[4px] items-center justify-center flex-col text-[rgb(128,184,238)]"><span>Chuẩn bị đến lượt quý khách.</span><span>Hãy sẵn sàng!</span></div>`;
    } else {
        songStatusElement.innerHTML = `<div class="flex gap-[4px] items-center justify-center flex-col text-[rgb(128,184,238)]"><span>Chỉ còn ${index} ca khúc.</span></div>`;
    }
}

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

getUserIndexById();
