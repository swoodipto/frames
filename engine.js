// Replace the videoData constant with a variable
let videoData = null;

// Add this variable at the top with other global variables
let player;

// Add this variable to track if the video was paused by scrolling
let pausedByScrolling = false;

// Add function to fetch video data
async function fetchVideoData() {
    try {
        const response = await fetch('videos.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.videos;
    } catch (error) {
        console.error('Error loading videos:', error);
        return [];
    }
}

// Add these variables at the top of your script
let currentPage = 1;
const videosPerPage = 9;
let hasMoreVideos = true;

// Function to load and display videos
async function loadVideos() {
    try {
        if (!videoData) {
            videoData = await fetchVideoData();
        }

        // Get unique categories (excluding 'All')
        const categories = [...new Set(videoData.flatMap(video => video.category))];
        
        // Create filter buttons
        const filterContainer = document.getElementById('filterContainer');
        
        // Create "All" button
        const allButton = document.createElement('button');
        allButton.className = 'filter-btn active';
        allButton.textContent = 'All';
        allButton.setAttribute('data-category', 'all');
        allButton.addEventListener('click', (event) => filterVideos('all', videoData, event));
        filterContainer.appendChild(allButton);
        
        // Create category filter buttons
        categories.forEach(category => {
            const button = document.createElement('button');
            button.className = 'filter-btn';
            button.textContent = category;
            button.setAttribute('data-category', category);
            button.addEventListener('click', (event) => filterVideos(category, videoData, event));
            filterContainer.appendChild(button);
        });
        
        // Check for filter parameters in URL and apply them
        const urlFilters = getUrlFilters();
        if (urlFilters.length > 0) {
            urlFilters.forEach(category => {
                const button = document.querySelector(`.filter-btn[data-category="${category}"]`);
                if (button) {
                    button.classList.add('active');
                    allButton.classList.remove('active');
                }
            });
            
            const filteredVideos = videoData.filter(video => 
                urlFilters.every(cat => video.category.includes(cat))
            );
            displayVideos(filteredVideos);
        } else {
            // Initial load of all videos if no filters in URL
            displayVideos(videoData);
        }

        // Check URL for video ID after videos are loaded
        checkUrlForVideo();
    } catch (error) {
        console.error('Error loading videos:', error);
    }
}

// Function to get filters from URL
function getUrlFilters() {
    const urlParams = new URLSearchParams(window.location.search);
    const filters = urlParams.get('filters');
    return filters ? filters.split(',') : [];
}

// Function to update URL with current filters
function updateUrlFilters(activeFilters) {
    const urlParams = new URLSearchParams(window.location.search);
    if (activeFilters.length > 0) {
    urlParams.set('filters', activeFilters.join(','));
    } else {
    urlParams.delete('filters');
    }
    
    // Preserve the frame parameter if it exists
    const frameParam = urlParams.get('frame');
    const newUrl = frameParam 
    ? `?${urlParams.toString()}`
    : activeFilters.length > 0 ? `?${urlParams.toString()}` : window.location.pathname;
    
    window.history.replaceState({}, '', newUrl);
}

// Function to filter videos
function filterVideos(category, videos, event) {
    const buttons = document.querySelectorAll('.filter-btn');
    const allButton = document.querySelector('[data-category="all"]');
    
    // Reset pagination when filters change
    currentPage = 1;
    hasMoreVideos = true;
    
    // If "All" is clicked, deactivate all other buttons
    if (category === 'all') {
    buttons.forEach(btn => btn.classList.remove('active'));
    allButton.classList.add('active');
    displayVideos(videos);
    updateUrlFilters([]);
    return;
    }
    
    // If shift is not held, deactivate all buttons except the clicked one
    if (!event.shiftKey) {
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    allButton.classList.remove('active');
    } else {
    // Toggle the clicked button
    event.target.classList.toggle('active');
    allButton.classList.remove('active');
    }

    // Get all active categories
    const activeCategories = Array.from(buttons)
    .filter(btn => btn.classList.contains('active'))
    .map(btn => btn.getAttribute('data-category'));

    // Update URL with current filters
    updateUrlFilters(activeCategories);

    // Filter videos that match ALL of the selected categories (AND logic)
    const filteredVideos = activeCategories.length > 0
    ? videos.filter(video => activeCategories.every(cat => video.category.includes(cat)))
    : videos;

    displayVideos(filteredVideos, false);
}

let currentVideoIndex = 0;
// Function to open modal with video
async function openModal(videoId) {
    pausedByScrolling = false;
    
    if (player) {
        player.destroy(); // Clean up previous player
    }
    
    const modal = document.getElementById('videoModal');
    
    // Find the video data by ID instead of relying on DOM elements
    currentVideoIndex = videoData.findIndex(video => video.id === videoId);
    
    // If video not found in videoData, default to first video
    if (currentVideoIndex === -1) {
        currentVideoIndex = 0;
        console.error("Video ID not found:", videoId);
    }
    
    updateModalVideo();
    modal.style.display = 'flex';
    window.scrollTo(0, 0);
    modal.scrollTo(0, 0);
    
    setupModalScrollHandler();
    
    document.addEventListener('keydown', handleKeyPress);
    
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('frame', videoId);
    window.history.replaceState({}, '', `?${urlParams.toString()}`);
}
// Function to close modal
function closeModal() {
    if (player) {
        player.destroy();
    }
    const modal = document.getElementById('videoModal');
    const modalVideoContainer = document.getElementById('modalVideoContainer');
    modal.style.display = 'none';
    modalVideoContainer.innerHTML = '';
    
    document.removeEventListener('keydown', handleKeyPress);
    
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.delete('frame');
    
    const remainingParams = urlParams.toString();
    const newUrl = remainingParams ? `?${remainingParams}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
}
// Function to check for video ID in URL and open modal if present
function checkUrlForVideo() {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('frame');
    if (videoId && videoData.length > 0) {
        openModal(videoId);
    }
}
// Function to navigate between videos
function navigateVideo(direction) {
    // Navigate through the videoData array instead of DOM elements
    currentVideoIndex = (currentVideoIndex + direction + videoData.length) % videoData.length;
    const videoId = videoData[currentVideoIndex].id;
    
    // Update URL preserving filter parameters
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('frame', videoId);
    window.history.replaceState({}, '', `?${urlParams.toString()}`);
    
    updateModalVideo();
}
// Function to update modal video
function updateModalVideo() {
    const modalVideoContainer = document.getElementById('modalVideoContainer');
    const currentVideo = videoData[currentVideoIndex];
    
    // Clear previous video
    modalVideoContainer.innerHTML = '';
    
    // Create new player
    const playerDiv = document.createElement('div');
    playerDiv.id = 'youtube-player';
    modalVideoContainer.appendChild(playerDiv);
    
    // Initialize YouTube player
    player = new YT.Player('youtube-player', {
        videoId: currentVideo.id,
        playerVars: {
            'autoplay': 1,
            'modestbranding': 1,
            'rel': 0
        },
        events: {
            'onStateChange': onPlayerStateChange
        }
    });
    
    // Update video info
    document.querySelector('.modal-video-number').textContent = formatProjectNumber(currentVideo.number);
    document.querySelector('.modal-video-title').textContent = currentVideo.title;
    document.querySelector('.modal-video-company').textContent = currentVideo.company;
    
    // Update suggested videos
    updateSuggestedVideos(currentVideo.id);
}
// Function to update suggested videos
function updateSuggestedVideos(currentVideoId) {
    const suggestedVideosContainer = document.getElementById('suggestedVideos');
    suggestedVideosContainer.innerHTML = '';
    
    // Get active filters
    const activeFilters = Array.from(document.querySelectorAll('.filter-btn.active'))
    .map(btn => btn.getAttribute('data-category'))
    .filter(cat => cat !== 'all'); // Exclude 'all' from filters
    
    // Filter videos based on active filters and current video
    let suggestedVideos = videoData
    .filter(video => video.id !== currentVideoId);
    
    // Apply category filters if active
    if (activeFilters.length > 0) {
    suggestedVideos = suggestedVideos.filter(video => 
        activeFilters.every(filter => video.category.includes(filter))
    );
    }
    
    // Shuffle and limit to 6 videos
    suggestedVideos = suggestedVideos
    .sort(() => Math.random() - 0.5)
    .slice(0, 6);
    
    // Create suggested video elements
    suggestedVideos.forEach(video => {
    const videoWrapper = createVideoElement(video);
    videoWrapper.onclick = () => {
        openModal(video.id);
        window.scrollTo(0, 0);
    };
    suggestedVideosContainer.appendChild(videoWrapper);
    });
}
// Helper function to create video element (reuse code from displayVideos)
function createVideoElement(video) {
    const videoWrapper = document.createElement('div');
    videoWrapper.className = 'video-wrapper';
    
    // Create top info section
    const videoInfoTop = document.createElement('div');
    videoInfoTop.className = 'video-info-top';
    
    const numberSpan = document.createElement('span');
    numberSpan.className = 'video-number';
    numberSpan.textContent = formatProjectNumber(video.number);
    
    const companySpan = document.createElement('span');
    companySpan.className = 'video-company';
    companySpan.textContent = video.company;
    
    videoInfoTop.appendChild(numberSpan);
    videoInfoTop.appendChild(companySpan);
    
    // Create video container
    const videoContainer = document.createElement('div');
    videoContainer.className = 'video-container';
    
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${video.id}?mute=1&controls=0&rel=0&autoplay=1&loop=1&playlist=${video.id}&showinfo=0&cc_load_policy=0&modestbranding=1&vq=small`;
    iframe.title = "YouTube video player";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.loading = "lazy";
    
    // Create bottom info section
    const videoInfoBottom = document.createElement('div');
    videoInfoBottom.className = 'video-info-bottom';
    
    const titleContainer = document.createElement('div');
    titleContainer.className = 'video-title-container';
    
    const titleSpan = document.createElement('span');
    titleSpan.className = 'video-title';
    titleSpan.textContent = video.title;
    
    const lengthContainer = document.createElement('div');
    lengthContainer.className = 'video-length-container';
    
    const lengthSpan = document.createElement('span');
    lengthSpan.className = 'video-length';
    lengthSpan.textContent = video.length;
    
    // Assemble the elements
    videoContainer.appendChild(iframe);
    titleContainer.appendChild(titleSpan);
    lengthContainer.appendChild(lengthSpan);
    videoInfoBottom.appendChild(titleContainer);
    videoInfoBottom.appendChild(lengthContainer);
    
    videoWrapper.appendChild(videoInfoTop);
    videoWrapper.appendChild(videoContainer);
    videoWrapper.appendChild(videoInfoBottom);
    
    return videoWrapper;
}
// Handle keyboard navigation
function handleKeyPress(event) {
    switch (event.key) {
    case 'ArrowLeft':
        navigateVideo(-1);
        break;
    case 'ArrowRight':
        navigateVideo(1);
        break;
    case 'Escape':
        closeModal();
        break;
    }
}
// Function to display videos
function displayVideos(videos, loadMore = false) {
    const videoGallery = document.getElementById('videoGallery');
    
    // Clear gallery if not loading more
    if (!loadMore) {
    videoGallery.innerHTML = '';
    }
    
    // Sort videos in descending order by number (newest first)
    const sortedVideos = [...videos].sort((a, b) => b.number - a.number);
    
    // Get the slice of videos to display
    const startIndex = (currentPage - 1) * videosPerPage;
    const endIndex = startIndex + videosPerPage;
    const videosToShow = sortedVideos.slice(startIndex, endIndex);
    
    // Display the videos
    videosToShow.forEach(video => {
    const videoWrapper = createVideoElement(video);
    videoWrapper.onclick = () => {
        openModal(video.id);
    };
    videoGallery.appendChild(videoWrapper);
    });
    
    // Check if there are more videos
    hasMoreVideos = endIndex < sortedVideos.length;
    
    // Add or update "Load More" button
    updateLoadMoreButton(sortedVideos);
}
// Close modal when clicking outside the video or on close button
document.getElementById('videoModal').addEventListener('click', (e) => {
    if (e.target.id === 'videoModal' || e.target.classList.contains('modal-close')) {
    closeModal();
    }
});
// Load videos when the page is ready
document.addEventListener('DOMContentLoaded', () => {
    currentPage = 1;
    hasMoreVideos = true;
    loadYouTubeAPI();
    loadVideos();
});

// Add this helper function at the top level
function formatProjectNumber(number) {
    // Convert to string and pad with leading zeros if less than 3 digits
    return `[${number.toString().padStart(3, '0')}]`;
}

// Add new function to create and handle "Load More" button
function updateLoadMoreButton(videos) {
    // Remove existing button if it exists
    const existingButton = document.querySelector('.load-more-btn');
    if (existingButton) {
    existingButton.remove();
    }
    
    // Add new button if there are more videos
    if (hasMoreVideos) {
    const loadMoreBtn = document.createElement('button');
    loadMoreBtn.className = 'load-more-btn';
    loadMoreBtn.textContent = 'spoil me with more';
    loadMoreBtn.onclick = () => {
        currentPage++;
        displayVideos(videos, true);
    };
    document.getElementById('videoGallery').after(loadMoreBtn);
    }
}

// Add function to handle player state changes
function onPlayerStateChange(event) {
    const suggestedVideosSection = document.querySelector('.suggested-videos-section');
    
    if (event.data === YT.PlayerState.PLAYING) {
        // Video is playing, reduce opacity
        suggestedVideosSection.style.opacity = '0.3';
        suggestedVideosSection.style.transition = 'opacity 0.3s ease';
    } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
        // Video is paused or ended, restore opacity
        suggestedVideosSection.style.opacity = '1';
        
        // If paused by user (not by scrolling), reset the flag
        if (event.data === YT.PlayerState.PAUSED && !pausedByScrolling) {
            pausedByScrolling = false;
        }
    }
}

// Add YouTube API loading
function loadYouTubeAPI() {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// Add this function to handle YouTube API ready state
window.onYouTubeIframeAPIReady = function() {
    // YouTube API is ready
    console.log('YouTube API Ready');
};

// Update the modal scroll handler function
function setupModalScrollHandler() {
    const modal = document.getElementById('videoModal');
    const videoContainer = document.querySelector('.modal-video-player');
    
    modal.addEventListener('scroll', function() {
        if (!player) return;
        
        // Get the position of the video container relative to the viewport
        const rect = videoContainer.getBoundingClientRect();
        const videoHeight = rect.height;
        
        // Calculate how much of the video is still visible (as a percentage)
        const visiblePercentage = Math.max(0, Math.min(100, 
            (rect.bottom / videoHeight) * 100
        ));
        
        // If less than 75% of the video is visible, pause it
        if (visiblePercentage < 75 && player.getPlayerState() === YT.PlayerState.PLAYING) {
            player.pauseVideo();
            pausedByScrolling = true; // Mark that we paused by scrolling
        } 
        // If more than 75% of the video is visible and it was paused by scrolling, resume it
        else if (visiblePercentage >= 75 && 
                 pausedByScrolling && 
                 player.getPlayerState() === YT.PlayerState.PAUSED) {
            player.playVideo();
            pausedByScrolling = false; // Reset the flag
        }
    });
}