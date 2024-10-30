import { auth, db } from './firebase-config.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { signInAnonymously } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

async function loadSelectedFile() {
    const user = auth.currentUser;
    const userDoc = await getDoc(doc(db, 'users', user.uid));

    if (userDoc.exists() && userDoc.data().songSelected) { 
        $('#content').load('/assets/html/selected.html', function(response, status, xhr) {
            if (status === "error") {
                console.error("Không thể tải tệp selected.html:", xhr.status, xhr.statusText);
            } else {
                $('body').css('overflow', 'hidden');
            }
        });
    }
}

async function checkUser() {
    const user = auth.currentUser;
    if (!user) {
        await signInAnonymously(auth);
        return checkUser();
    } else {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists() || !userDoc.data().fullName) {
            $('#content').load('/assets/html/infor.html', function(response, status, xhr) {
                if (status === "success") {
                    $('body').css('overflow', 'hidden');
                }
            });
        } else {
            loadSelectedFile();
        }
    }
}

function capitalizeAllInputs(formSelector) {
    $(formSelector).find('input[type="text"], textarea').each(function() {
        var currentVal = $(this).val();
        var capitalizedVal = capitalizeWords(currentVal); // Gọi hàm capitalizeWords đã định nghĩa trước đó
        $(this).val(capitalizedVal);
    });
}

// Hàm capitalizeWords như đã định nghĩa trước đó
function capitalizeWords(str) {
    var words = str.toLowerCase().split(" ");
    for (var i = 0; i < words.length; i++) {
        words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1);
    }
    return words.join(" ");
}

$(document).on('submit', '#edit-full-name-form', async function(event) {
    event.preventDefault();
    capitalizeAllInputs('#edit-full-name-form');

    // Lấy giá trị đã viết hoa
    var fullName = $('#fullName').val().trim();
    var location = $('#location').val().trim();
    if (!fullName) {
        return;
    }
    const user = auth.currentUser;
    await setDoc(doc(db, 'users', user.uid), {
        fullName: fullName,
        location: location,
        songSelected: false
    });
    $('#content').empty();
    $('body').removeAttr('style');
});

checkUser();
