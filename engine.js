// Replace the videoData constant with a variable
let videoData = null;

// Add this variable at the top with other global variables
let player;

// Add this variable to track if the video was paused by scrolling
let pausedByScrolling = false;

// Add these variables at the top with other global variables
let videoObservers = new Map(); // Track observers for each video

// Add this at the top with other global variables
let mainContentState = {
    scrollPosition: 0,
    content: null
};

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
        
        // Create filter buttons - ONLY if they don't already exist
        const filterContainer = document.getElementById('filterContainer');
        
        // Clear existing filters first to prevent duplicates
        if (filterContainer.children.length === 0) {
            // Create "All" button
            const allButton = document.createElement('button');
            allButton.className = 'filter-btn active';
            allButton.textContent = 'All';
            
            // Add count for all videos
            const allCount = document.createElement('sup');
            allCount.textContent = videoData.length;
            allButton.appendChild(allCount);
            
            allButton.setAttribute('data-category', 'all');
            allButton.addEventListener('click', (event) => filterVideos('all', videoData, event));
            filterContainer.appendChild(allButton);
            
            // Create category filter buttons
            categories.forEach(category => {
                // Count videos in this category
                const categoryCount = videoData.filter(video => video.category.includes(category)).length;
                
                const button = document.createElement('button');
                button.className = 'filter-btn';
                button.textContent = category;
                
                // Add count as superscript
                const count = document.createElement('sup');
                count.textContent = categoryCount;
                button.appendChild(count);
                
                button.setAttribute('data-category', category);
                button.addEventListener('click', (event) => filterVideos(category, videoData, event));
                filterContainer.appendChild(button);
            });
        }
        
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
    console.log('Opening modal for video:', videoId);
    pausedByScrolling = false;
    
    if (player) {
        player.destroy(); // Clean up previous player
    }
    
    const modal = document.getElementById('videoModal');
    
    // Store scroll position and detach main content
    mainContentState.scrollPosition = window.scrollY;
    
    // Find and store main content - specifically the video gallery
    const mainContent = document.querySelector('.video-grid');
    if (mainContent) {
        console.log('Found video grid, preparing to detach');
        mainContentState.content = mainContent;
        
        // Create placeholder to maintain document height
        const placeholder = document.createElement('div');
        placeholder.style.height = `${mainContent.offsetHeight}px`;
        placeholder.id = 'main-content-placeholder';
        
        // Clean up video resources before detaching
        mainContent.querySelectorAll('.video-container iframe').forEach(iframe => {
            const wrapper = iframe.closest('.video-wrapper');
            if (wrapper) {
                const videoId = wrapper.dataset.videoId;
                if (videoId) {
                    const container = iframe.parentElement;
                    unloadVideo(container, videoId);
                }
            }
        });
        
        // Disconnect all observers
        videoObservers.forEach(observer => observer.disconnect());
        videoObservers.clear();
        
        // Replace main content with placeholder
        mainContent.parentNode.replaceChild(placeholder, mainContent);
        console.log('Video grid detached and replaced with placeholder');
    } else {
        console.warn('Video grid not found');
    }
    
    // Find the video data by ID
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
    
    // Prevent body scrolling while modal is open
    document.body.style.overflow = 'hidden';
    
    setupModalScrollHandler();
    document.addEventListener('keydown', handleKeyPress);
    
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('frame', videoId);
    window.history.replaceState({}, '', `?${urlParams.toString()}`);
}
// Function to close modal
function closeModal() {
    console.log('Closing modal');
    if (player) {
        player.destroy();
    }
    const modal = document.getElementById('videoModal');
    const modalVideoContainer = document.getElementById('modalVideoContainer');
    modal.style.display = 'none';
    modalVideoContainer.innerHTML = '';
    
    // Restore main content
    const placeholder = document.getElementById('main-content-placeholder');
    if (placeholder && mainContentState.content) {
        console.log('Found placeholder and stored content, restoring video grid');
        // Restore the main content
        placeholder.parentNode.replaceChild(mainContentState.content, placeholder);
        
        // Restore scroll position
        window.scrollTo({
            top: mainContentState.scrollPosition,
            behavior: 'auto' // Use auto to prevent smooth scrolling
        });
        
        // Re-initialize video observers for visible videos
        initializeVideoObservers();
        
        // Clear the stored content reference
        mainContentState.content = null;
        console.log('Video grid restored and observers reinitialized');
    } else {
        console.warn('Placeholder or stored content not found');
    }
    
    // Re-enable body scrolling
    document.body.style.overflow = '';
    
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
        // Small delay to ensure content is fully loaded
        setTimeout(() => {
            openModal(videoId);
        }, 100);
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
    
    // Initialize YouTube player with rel=0 and other parameters
    player = new YT.Player('youtube-player', {
        videoId: currentVideo.id,
        playerVars: {
            'autoplay': 1,
            'modestbranding': 1,
            'rel': 0,            // This disables related videos
            'showinfo': 0,       // Hides video info
            'controls': 1,
            'fs': 1,            // Allows fullscreen
            'iv_load_policy': 3, // Hides video annotations
            'enablejsapi': 1     // Enables JavaScript API
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
    
    // Initialize observers for suggested videos
    initializeVideoObservers();
}
// Helper function to create video element (reuse code from displayVideos)
function createVideoElement(video) {
    const videoWrapper = document.createElement('div');
    videoWrapper.className = 'video-wrapper';
    videoWrapper.dataset.videoId = video.id;
    
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
    
    // Create video container with fixed aspect ratio
    const videoContainer = document.createElement('div');
    videoContainer.className = 'video-container';
    videoContainer.style.position = 'relative';
    videoContainer.style.width = '100%';
    videoContainer.style.height = '0';
    videoContainer.style.paddingBottom = '56.25%'; // 16:9 aspect ratio
    videoContainer.style.backgroundColor = 'var(--primary-dark-400)';
    videoContainer.style.borderRadius = 'var(--border-radius-small)';
    videoContainer.style.overflow = 'hidden';
    
    // Create placeholder with proper positioning
    const placeholder = document.createElement('div');
    placeholder.className = 'video-placeholder';
    placeholder.style.position = 'absolute';
    placeholder.style.top = '0';
    placeholder.style.left = '0';
    placeholder.style.width = '100%';
    placeholder.style.height = '100%';
    placeholder.style.backgroundSize = 'cover';
    placeholder.style.backgroundPosition = 'center';
    placeholder.style.backgroundImage = `url(https://img.youtube.com/vi/${video.id}/mqdefault.jpg)`;
    
    videoContainer.appendChild(placeholder);
    
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
    
    // Initialize observers for new videos
    initializeVideoObservers();
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
    loadVideos().then(() => {
        addPlaceholderStyles();
        initializeVideoObservers();
    });
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

// Add this function to initialize intersection observers for videos
function initializeVideoObservers() {
    // Disconnect any existing observers
    videoObservers.forEach(observer => observer.disconnect());
    videoObservers.clear();
    
    // Create new observers for all videos
    document.querySelectorAll('.video-container').forEach(container => {
        const observer = createVideoObserver(container);
        const videoId = container.closest('.video-wrapper')?.dataset.videoId;
        if (videoId) {
            videoObservers.set(videoId, observer);
            observer.observe(container);
        }
    });
}

// Function to create an observer for a video container
function createVideoObserver(container) {
    return new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const wrapper = entry.target.closest('.video-wrapper');
            if (!wrapper) return;
            
            const videoId = wrapper.dataset.videoId;
            if (!videoId) return;
            
            // Add a small threshold to prevent rapid loading/unloading at viewport edges
            if (entry.isIntersecting && entry.intersectionRatio > 0.2) {
                // Video is visible in viewport - load if not already loaded
                if (!entry.target.querySelector('iframe')) {
                    loadVideo(entry.target, videoId);
                }
            } else if (!entry.isIntersecting || entry.intersectionRatio < 0.1) {
                // Video is out of viewport - unload to save memory
                // Only unload if it's significantly out of view
                const iframe = entry.target.querySelector('iframe');
                if (iframe) {
                    unloadVideo(entry.target, videoId);
                }
            }
        });
    }, {
        root: null,
        rootMargin: '100px', // Larger margin to start loading earlier
        threshold: [0.1, 0.2, 0.5] // Multiple thresholds for smoother transitions
    });
}

// Function to load a video
function loadVideo(container, videoId) {
    // Create iframe with rel=0 and other parameters
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}?mute=1&controls=0&rel=0&autoplay=1&loop=1&playlist=${videoId}&showinfo=0&cc_load_policy=0&modestbranding=1&vq=small&iv_load_policy=3&fs=0&disablekb=1&playsinline=1`;
    
    iframe.title = "YouTube video player";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.loading = "lazy";
    
    // Apply inline styles
    iframe.style.position = 'absolute';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.borderRadius = 'var(--border-radius-small)';
    
    container.appendChild(iframe);
}

// Function to unload a video
function unloadVideo(container, videoId) {
    // Find the iframe
    const iframe = container.querySelector('iframe');
    if (!iframe) return;
    
    // Check if placeholder already exists
    let placeholder = container.querySelector('.video-placeholder');
    
    if (!placeholder) {
        // Create placeholder with video thumbnail
        placeholder = document.createElement('div');
        placeholder.className = 'video-placeholder';
        placeholder.style.backgroundImage = `url(https://img.youtube.com/vi/${videoId}/mqdefault.jpg)`;
        container.appendChild(placeholder);
    } else {
        // Make existing placeholder visible again
        placeholder.style.opacity = '1';
    }
    
    // Remove the iframe after a short delay to prevent layout shift
    setTimeout(() => {
        if (iframe && iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
        }
    }, 50);
}

// Replace the addPlaceholderStyles function with this version
function addPlaceholderStyles() {
    // Remove any existing placeholder styles to prevent duplicates
    const existingStyle = document.getElementById('placeholder-styles');
    if (existingStyle) {
        existingStyle.remove();
    }
    
    const style = document.createElement('style');
    style.id = 'placeholder-styles';
    style.textContent = `
        /* Reset any existing styles that might interfere */
        .video-container {
            position: relative !important;
            width: 100% !important;
            height: 0 !important;
            padding-bottom: 56.25% !important; /* 16:9 Aspect Ratio */
            background-color: var(--primary-dark-400) !important;
            border-radius: var(--border-radius-small) !important;
            overflow: hidden !important;
            margin: 0 !important;
        }
        
        .video-placeholder {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background-size: cover !important;
            background-position: center !important;
            border-radius: var(--border-radius-small) !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        
        .video-container iframe {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            border: none !important;
            border-radius: var(--border-radius-small) !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        
        /* Hide YouTube player chrome */
        .ytp-chrome-top, .ytp-chrome-bottom {
            display: none !important;
        }
        
        /* Force aspect ratio for YouTube player */
        .video-container iframe {
            object-fit: cover !important;
        }
    `;
    document.head.appendChild(style);
}

// Add window resize handler to reinitialize observers
window.addEventListener('resize', debounce(() => {
    initializeVideoObservers();
}, 200));

// Add scroll event handler to check for new videos after scrolling
window.addEventListener('scroll', debounce(() => {
    initializeVideoObservers();
}, 200));

// Helper function for debouncing
function debounce(func, wait, immediate = false) {
    let timeout;
    return function(...args) {
        const context = this;
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

// Add a scroll position memory to maintain position when loading more videos
let lastScrollPosition = 0;

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
            // Store current scroll position before loading more
            lastScrollPosition = window.scrollY;
            
            currentPage++;
            displayVideos(videos, true);
            
            // Restore scroll position after a short delay to allow DOM updates
            setTimeout(() => {
                window.scrollTo({
                    top: lastScrollPosition,
                    behavior: 'auto' // Use 'auto' instead of 'smooth' to prevent additional animation
                });
            }, 100);
        };
        document.getElementById('videoGallery').after(loadMoreBtn);
    }
}

// Use a more efficient scroll handler
const efficientScrollHandler = debounce(() => {
    // Only reinitialize observers for videos near the viewport
    const viewportHeight = window.innerHeight;
    const scrollY = window.scrollY;
    const buffer = viewportHeight * 2; // 2x viewport height buffer
    
    document.querySelectorAll('.video-container').forEach(container => {
        const rect = container.getBoundingClientRect();
        const absoluteTop = rect.top + scrollY;
        
        // Only process containers that are within our buffer zone
        if (absoluteTop >= scrollY - buffer && absoluteTop <= scrollY + viewportHeight + buffer) {
            const videoId = container.closest('.video-wrapper')?.dataset.videoId;
            if (videoId && !videoObservers.has(videoId)) {
                const observer = createVideoObserver(container);
                videoObservers.set(videoId, observer);
                observer.observe(container);
            }
        }
    });
}, 100);

// Replace the scroll event handler
window.removeEventListener('scroll', window.lastScrollHandler);
window.lastScrollHandler = efficientScrollHandler;
window.addEventListener('scroll', efficientScrollHandler);

// Add a resize handler that's less aggressive
const efficientResizeHandler = debounce(() => {
    // Disconnect all observers and reinitialize
    videoObservers.forEach(observer => observer.disconnect());
    videoObservers.clear();
    
    // Only initialize observers for videos near the viewport
    efficientScrollHandler();
}, 250);

// Replace the resize event handler
window.removeEventListener('resize', window.lastResizeHandler);
window.lastResizeHandler = efficientResizeHandler;
window.addEventListener('resize', efficientResizeHandler);

// Add a helper function to preload images to prevent flashing
function preloadThumbnail(videoId) {
    const img = new Image();
    img.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

// Preload thumbnails for visible and nearby videos
function preloadVisibleThumbnails() {
    videoData.slice(0, currentPage * videosPerPage).forEach(video => {
        preloadThumbnail(video.id);
    });
}

// Call this after loading videos
document.addEventListener('DOMContentLoaded', () => {
    currentPage = 1;
    hasMoreVideos = true;
    loadYouTubeAPI();
    loadVideos().then(() => {
        addPlaceholderStyles();
        initializeVideoObservers();
        preloadVisibleThumbnails();
    });
});

// Add this function to help us debug the issue
function inspectVideoContainers() {
    console.log("Inspecting video containers...");
    const containers = document.querySelectorAll('.video-container');
    console.log(`Found ${containers.length} video containers`);
    
    containers.forEach((container, index) => {
        const iframe = container.querySelector('iframe');
        if (iframe) {
            console.log(`Container ${index} has iframe:`, {
                containerWidth: container.offsetWidth,
                containerHeight: container.offsetHeight,
                iframeWidth: iframe.offsetWidth,
                iframeHeight: iframe.offsetHeight,
                aspectRatio: container.offsetWidth / container.offsetHeight,
                src: iframe.src
            });
        } else {
            console.log(`Container ${index} has no iframe, just placeholder`);
        }
    });
}

// Call this after videos are loaded
setTimeout(inspectVideoContainers, 2000);

// Add error handling for edge cases
window.addEventListener('error', function(event) {
    // Ignore YouTube postMessage errors as they're not critical
    if (event.message.includes('postMessage') && event.message.includes('youtube.com')) {
        return;
    }
    
    // Handle other errors
    if (document.getElementById('videoModal').style.display === 'flex') {
        console.error('Error in modal:', event.error);
        closeModal(); // Attempt to close modal and restore content
    }
});

// Add a cleanup function for when the page is unloaded
window.addEventListener('beforeunload', () => {
    // Restore main content if modal is open
    if (document.getElementById('videoModal').style.display === 'flex') {
        const placeholder = document.getElementById('main-content-placeholder');
        if (placeholder && mainContentState.content) {
            placeholder.parentNode.replaceChild(mainContentState.content, placeholder);
        }
    }
});

// Optional: Add performance monitoring
function logMemoryUsage(action) {
    if (window.performance && window.performance.memory) {
        console.log(`Memory usage (${action}):`, {
            usedJSHeapSize: Math.round(window.performance.memory.usedJSHeapSize / (1024 * 1024)) + 'MB',
            totalJSHeapSize: Math.round(window.performance.memory.totalJSHeapSize / (1024 * 1024)) + 'MB',
            timestamp: new Date().toISOString()
        });
    }
}