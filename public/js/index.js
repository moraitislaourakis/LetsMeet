// Initialize Leaflet map
const map = L.map('map').setView([37.9838, 23.7275], 13); // Default to Athens
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let marker;

// Handle map click to place marker and update hidden inputs
map.on('click', function (e) {
    const { lat, lng } = e.latlng;

    if (marker) {
        marker.setLatLng([lat, lng]);
    } else {
        marker = L.marker([lat, lng]).addTo(map);
    }

    $('#latitude').val(lat);
    $('#longitude').val(lng);
});

// map.on('click', function(e) {
//     const { lat, lng } = e.latlng;

//     // Place or move marker
//     if (marker) marker.setLatLng([lat, lng]);
//     else marker = L.marker([lat, lng]).addTo(map);

//     // Store coordinates
//     $('#latitude').val(lat);
//     $('#longitude').val(lng);

//     // Reverse geocoding to get place name
//     fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
//         .then(res => res.json())
//         .then(data => {
//             console.log(data); // full info from OSM
//             // Example: data.name, data.display_name
//             $('#location').val(data.name || data.display_name || "");
//         })
//         .catch(err => {
//             console.log("Reverse geocoding error:", err);
//         });
// });


// Initialize Flatpickr for date & time
const today = new Date();
today.setHours(21, 0, 0, 0); // set 21:00:00

flatpickr("#datetime", {
    enableTime: true,           // allow time selection
    dateFormat: "Y-m-d H:i",    // backend-friendly format
    defaultDate: today,
    minDate: "today",
    time_24hr: true             // 24-hour format
});

$(document).ready(function () {
    $('#meetForm').on('submit', function (e) {
        e.preventDefault(); // prevent normal form submit

        const formData = {
            title: $('input[name="title"]').val(),
            location: $('input[name="location"]').val(),
            latitude: $('#latitude').val(),
            longitude: $('#longitude').val(),
            description: $('input[name="description"]').val(),
            date: $('#datetime').val(),
            // Optional: if you have separate time input
            time: $('#time').val() || null
        };
        if (!$('#latitude').val() || !$('#longitude').val()) {
            return Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Βάλε κάτι στον χάρτη μωρή'
            })
        }

        $.ajax({
            url: '/send',
            type: 'POST',
            data: formData,
            success: function (response) {
                Swal.fire({
                    icon: 'success',
                    title: 'Invitation Sent!',
                    text: 'ΘΑ ΒΓΟΥΜΕΕΕΕ!',
                    timer: 2500,
                    showConfirmButton: false
                });

                // Clear form and map fields
                $('#meetForm')[0].reset();
                $('#latitude').val('');
                $('#longitude').val('');
                // Optional: remove map marker
                if (marker) {
                    map.removeLayer(marker);
                }
            },
            error: function (xhr, status, error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Oops...',
                    text: 'Error sending invitation: ' + xhr.responseText
                });
            }
        });

    });
});
