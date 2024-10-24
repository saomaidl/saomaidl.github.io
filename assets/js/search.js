$(document).ready(function() {
    const $search = $('#search');
    const $clearSearch = $('#clearSearch');
    const apiKey = 'AIzaSyAaQnJKKHqLZIQKCAFiwStspPcAKskUxmE';
    let currentTab = 'TẤT CẢ';

    initEventListeners();

    function initEventListeners() {
        $search.on('input', handleSearchInput);
        $clearSearch.on('click', clearSearch);
        $('#search').on('keydown', handleKeyDown);
        $(document).on('click', '.chip-container', handleChipClick);
        $(document).on('click', '.clear-button', clearSearchInput);
    }

    function handleSearchInput() {
        toggleClearButton();
        showClearButton();
    }

    function toggleClearButton() {
        $clearSearch.toggle($search.val().length > 0);
    }

    function showClearButton() {
        $('.clear-button').remove();
        if ($search.val().trim() !== '') {
            const clearButton = `
                <button class="clear-button absolute right-3 top-1-2 -translate-y-1-2" aria-label="Clear search field">
                    <span aria-hidden="true">
                        <svg viewBox="0 0 16 16" class="w-5 h-5 fill-current">
                            <path d="M2.47 2.47a.75.75 0 0 1 1.06 0L8 6.94l4.47-4.47a.75.75 0 1 1 1.06 1.06L9.06 8l4.47 4.47a.75.75 0 1 1-1.06 1.06L8 9.06l-4.47 4.47a.75.75 0 0 1-1.06-1.06L6.94 8 2.47 3.53a.75.75 0 0 1 0-1.06Z"></path>
                        </svg>
                    </span>
                </button>
            `;
            $search.after(clearButton);
        }
    }

    function clearSearch() {
        $search.val('').trigger('input');
    }

    function handleKeyDown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            searchVideos();
        }
    }

    function handleChipClick() {
        const parentChip = $(this).closest('ytm-chip-cloud-chip-renderer');
        if (parentChip.attr('chip-style') === 'STYLE_HOME_FILTER') {
            $('ytm-chip-cloud-chip-renderer').removeClass('selected all-chip-renderer');
            parentChip.addClass('selected all-chip-renderer');
            $('ytm-chip-cloud-chip-renderer').attr('aria-selected', 'false');
            parentChip.attr('aria-selected', 'true');
            currentTab = $(this).attr('aria-label');
            searchVideos();
        }
    }

    function clearSearchInput() {
        $search.val('');
        $(this).remove();
    }

    function searchVideos() {
        const baseQuery = $search.val().trim();
        if (!baseQuery) return;
        $search.val(baseQuery);
        $search.attr('value', baseQuery);
        const query = currentTab !== 'TẤT CẢ' ? `${currentTab.toLowerCase()} ${baseQuery}` : baseQuery;
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=24&q=${query}&type=video&key=${apiKey}`;

        $.getJSON(url, handleSearchResponse);
    }

    function handleSearchResponse(data) {
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
            const channelThumbnails = getChannelThumbnails(channelData);
            renderVideos(data.items, videoDetailsData, channelThumbnails);
        }).catch(error => {
            console.error("Error fetching video/channel details: ", error);
        });
    }

    function getChannelThumbnails(channelData) {
        return channelData.items.reduce((acc, channel) => {
            acc[channel.id] = channel.snippet.thumbnails.default.url;
            return acc;
        }, {});
    }

    function renderVideos(items, videoDetailsData, channelThumbnails) {
        items.forEach((item, index) => {
            const { videoId, title, channelTitle, publishedAt, channelId } = item.snippet;
            const videoIdItem = item.id.videoId;
            const thumbnailUrl = item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url;
            const viewCount = videoDetailsData.items[index].statistics.viewCount;
            const duration = formatDuration(videoDetailsData.items[index].contentDetails.duration);
            const channelThumbnailUrl = channelThumbnails[channelId];

            const mbClass = index === items.length - 1 ? '' : ' mb-6';
            const videoItem = $(`
                <div id="playlist" class="cursor-pointer flex w-full flex-col${mbClass}" data-video-id="${videoIdItem}" data-video-title="${title}" data-thumbnail="${thumbnailUrl}" data-view-count="${formatViews(viewCount)}" data-duration="${duration}" data-channel-thumbnail-url="${channelThumbnailUrl}" data-channel-title="${channelTitle}" data-published-at="${formatDate(publishedAt)}" data-channel-id="${channelId}">
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
                                                    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
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
