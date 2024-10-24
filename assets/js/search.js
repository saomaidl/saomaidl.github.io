$(document).ready(function() {
    const $search = $('#search');
    const $clearSearch = $('#clearSearch');

    // Hiện/ẩn nút xóa tìm kiếm
    $search.on('input', function() {
        $clearSearch.toggle($(this).val().length > 0);
    });

    // Xóa nội dung tìm kiếm khi nút xóa được nhấn
    $clearSearch.on('click', function() {
        $search.val('').trigger('input');
    });

    let currentTab = 'TẤT CẢ';

    // Chọn tab tìm kiếm
    $(document).on('click', '.chip-container', function() {
        const parentChip = $(this).closest('ytm-chip-cloud-chip-renderer');
        if (parentChip.attr('chip-style') === 'STYLE_HOME_FILTER') {
            $('ytm-chip-cloud-chip-renderer').removeClass('selected all-chip-renderer');
            parentChip.addClass('selected all-chip-renderer');
            $('ytm-chip-cloud-chip-renderer').attr('aria-selected', 'false');
            parentChip.attr('aria-selected', 'true');
            currentTab = $(this).attr('aria-label');
            searchVideos();
        }
    });

    // Gọi hàm tìm kiếm khi nhấn Enter
    $('#search').on('keydown', function(event) {
        if (event.key === 'Enter') {
            searchVideos();
        }
    });

    function searchVideos() {
        const baseQuery = $search.val().trim();
        if (!baseQuery) return;

        // Tạo query tìm kiếm
        const query = currentTab !== 'TẤT CẢ' ? `${currentTab.toLowerCase()} ${baseQuery}` : baseQuery;

        const apiKey = 'AIzaSyAaQnJKKHqLZIQKCAFiwStspPcAKskUxmE';
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=24&q=${query}&type=video&key=${apiKey}`;

        $.getJSON(url, function(data) {
            $('#videoList').empty().append('<div id="list" class="w-full h-full"></div>');

            if (!data.items.length) return alert('Không tìm thấy video nào.');

            const videoIds = data.items.map(item => item.id.videoId).join(',');
            const channelIds = [...new Set(data.items.map(item => item.snippet.channelId))].join(',');
            const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${videoIds}&key=${apiKey}`;
            const channelDetailsUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelIds}&key=${apiKey}`;

            Promise.all([
                $.getJSON(videoDetailsUrl),
                $.getJSON(channelDetailsUrl)
            ]).then(([videoDetailsData, channelData]) => {
                const channelThumbnails = {};
                channelData.items.forEach(channel => {
                    channelThumbnails[channel.id] = channel.snippet.thumbnails.default.url;
                });

                data.items.forEach((item, index) => {
                    const { videoId, title, channelTitle, publishedAt, channelId } = item.snippet;
                    const thumbnailUrl = item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url;
                    const viewCount = videoDetailsData.items[index].statistics.viewCount;
                    const duration = formatDuration(videoDetailsData.items[index].contentDetails.duration);
                    const channelThumbnailUrl = channelThumbnails[channelId];

                    const mbClass = index === data.items.length - 1 ? '' : ' mb-6';
                    const videoItem = $(`
                        <div class="cursor-pointer flex w-full flex-col${mbClass}">
                            <div class="relative video-thumbnail-container-large center block m-0 p-0">
                                <div class="cover video-thumbnail-img video-thumbnail-bg"></div>
                                <img src="${thumbnailUrl}" class="w-full h-full cover object-cover" />
                                <div class="absolute bottom-0 right-0 m-2">
                                    <div class="badge">${duration}</div>
                                </div>
                            </div>
                            <div class="details">
                                <div class="media-channel">
                                    <icon class="channel-thumbnail-icon YtProfileIconHost" aria-hidden="false">
                                        <img alt="Truy cập kênh" class="YtProfileIconImage" src="${channelThumbnailUrl}">
                                    </icon>
                                </div>
                                <div class="media-item-info cbox">
                                    <div class="media-item-metadata">
                                        <h3 class="mb-1">
                                            <span class="text-black font-bold line-clamp-2 leading-6 text-lg">${title}</span>
                                        </h3>
                                        <span class="text-gray-400 text-sm">${channelTitle} • ${formatViews(viewCount)} • ${formatDate(publishedAt)}</span>
                                    </div>
                                    <menu-renderer class="media-item-menu">
                                        <menu>
                                            <button class="icon-button text-black" aria-label="Menu" aria-haspopup="true">
                                                <c3-icon>
                                                    <span class="yt-icon-shape yt-spec-icon-shape">
                                                        <div style="width: 100%; height: 100%; display: block; fill: currentcolor;">
                                                            <svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24">
                                                                <path d="M10.5 4.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0zm0 15a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0zm0-7.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0z"></path>
                                                            </svg>
                                                        </div>
                                                    </span>
                                                </c3-icon>
                                            </button>
                                        </menu>
                                    </menu-renderer>
                                </div>
                            </div>
                        </div>
                    `);
                    $('#list').append(videoItem);
                });
            }).catch(error => {
                console.error("Error fetching video/channel details: ", error);
            });
        });
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Vừa xong';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
        if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 604800)} tuần trước`;
        return `${Math.floor(diffInSeconds / 31536000)} năm trước`;
    }

    function formatViews(views) {
        if (views > 1000000) return (views / 1000000).toFixed(1) + ' Tr lượt xem';
        if (views > 1000) return (views / 1000).toFixed(1) + ' N lượt xem';
        return views + ' lượt xem';
    }

    function formatDuration(duration) {
        const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        if (!match) return '00:00';

        const hours = match[1] ? match[1].slice(0, -1) : '0';
        const minutes = match[2] ? match[2].slice(0, -1) : '0';
        const seconds = match[3] ? match[3].slice(0, -1) : '0';

        return hours === '0' ? `${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}` : `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
    }
});
