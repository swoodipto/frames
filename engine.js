// Video data
const videoData = {
"videos": [
    {
        "number": 1,
        "id": "1PWJqjd2d6M",
        "title": "For All Things Worth Saving",
        "company": "Dropbox",
        "category": ["Story", "2D", "UI"],
        "length": "49s"
    },
    {
        "number": 2,
        "id": "bv936eeoxmQ",
        "title": "Framer Design: Design on an intuitive Canvas",
        "company": "Framer",
        "category": ["2D", "UI"],
        "length": "59s"
    },
    {
        "number": 3,
        "id": "5XxIwPKMlek",
        "title": "Introducing Wix Studio",
        "company": "Wix",
        "category": ["2D", "3D", "UI"],
        "length": "1m 43s"
    },
    {
        "number": 4,
        "id": "Er04BDbtSIg",
        "title": "School of Motion: Join the Movement",
        "company": "School of Motion",
        "category": ["2D", "Faux 3D", "Story"],
        "length": "1m 50s"
    },
    {
        "number": 5,
        "id": "pBy1zgt0XPc",
        "title": "What is GitHub?",
        "company": "GitHub",
        "category": ["Story", "2D", "3D", "Faux 3D"],
        "length": "2m 43s"
    },
    {
        "number": 6,
        "id": "EDATYbzYGiE",
        "title": "What is Slack? Your Work OS",
        "company": "Slack",
        "category": ["2D", "UI"],
        "length": "2m 48s"
    },
    {
        "number": 7,
        "id": "_qCBg_Wsr8M",
        "title": "Welcome to the Age of No-code",
        "company": "Webflow",
        "category": ["Story", "2D", "Faux 3D"],
        "length": "1m 29s"
    },
    {
        "number": 8,
        "id": "sIfP9h-H23s",
        "title": "Introducing Spline",
        "company": "Spline",
        "category": ["Story", "2D", "3D"],
        "length": "1m 25s"
    },
    {
        "number": 9,
        "id": "VQ2scsSPZN4",
        "title": "Google Bard",
        "company": "Greyable",
        "category": ["Typography", "2D", "UI"],
        "length": "35s"
    },
    {
        "number": 10,
        "id": "jX4dLxiso6A",
        "title": "Doks.AI by Zelios",
        "company": "Doks.AI",
        "category": ["2D", "Faux 3D", "UI"],
        "length": "20s"
    },
    {
        "number": 11,
        "id": "9K6U_mD3Ock",
        "title": "Adobe Creative Cloud",
        "company": "허투루",
        "category": ["2D", "Faux 3D", "UI"],
        "length": "31s"
    },
    {
        "number": 12,
        "id": "4SCjXcBeW1E",
        "title": "Introducing Google Vids",
        "company": "Google",
        "category": ["Typography", "2D", "UI"],
        "length": "1m 26s"
    }
]
};

// Add these variables at the top of your script
let currentPage = 1;
const videosPerPage = 9;
let hasMoreVideos = true;

// Function to load and display videos
async function loadVideos() {
    try {
    // Get unique categories (excluding 'All')
    const categories = [...new Set(videoData.videos.flatMap(video => video.category))];
    
    // Create filter buttons
    const filterContainer = document.getElementById('filterContainer');
    
    // Create "All" button
    const allButton = document.createElement('button');
    allButton.className = 'filter-btn active';
    allButton.textContent = 'All';
    allButton.setAttribute('data-category', 'all');
    allButton.addEventListener('click', (event) => filterVideos('all', videoData.videos, event));
    filterContainer.appendChild(allButton);
    
    // Create category filter buttons
    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'filter-btn';
        button.textContent = category;
        button.setAttribute('data-category', category);
        button.addEventListener('click', (event) => filterVideos(category, videoData.videos, event));
        filterContainer.appendChild(button);
    });
    
    // Check for filter parameters in URL and apply them
    const urlFilters = getUrlFilters();
    if (urlFilters.length > 0) {
        // Activate filter buttons based on URL parameters
        urlFilters.forEach(category => {
        const button = document.querySelector(`.filter-btn[data-category="${category}"]`);
        if (button) {
            button.classList.add('active');
            allButton.classList.remove('active');
        }
        });
        
        // Filter videos based on URL parameters
        const filteredVideos = videoData.videos.filter(video => 
        urlFilters.every(cat => video.category.includes(cat))
        );
        displayVideos(filteredVideos);
    } else {
        // Initial load of all videos if no filters in URL
        displayVideos(videoData.videos);
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
let currentVideos = [];
// Function to open modal with video
function openModal(videoId) {
    const modal = document.getElementById('videoModal');
    currentVideos = document.querySelectorAll('.video-wrapper');
    currentVideoIndex = Array.from(currentVideos).findIndex(
    wrapper => wrapper.querySelector('iframe').src.includes(videoId)
    );
    updateModalVideo();
    modal.style.display = 'flex';
    window.scrollTo(0, 0); // Ensure page scrolls to top
    modal.scrollTo(0, 0); // Ensure modal content scrolls to top
    
    // Add keyboard listener
    document.addEventListener('keydown', handleKeyPress);
    
    // Update URL preserving filter parameters
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('frame', videoId);
    window.history.replaceState({}, '', `?${urlParams.toString()}`);
}
// Function to close modal
function closeModal() {
    const modal = document.getElementById('videoModal');
    const modalVideoContainer = document.getElementById('modalVideoContainer');
    modal.style.display = 'none';
    modalVideoContainer.innerHTML = '';
    
    // Remove keyboard listener
    document.removeEventListener('keydown', handleKeyPress);
    
    // Get current URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    // Remove frame parameter
    urlParams.delete('frame');
    
    // Update URL, preserving any filter parameters
    const remainingParams = urlParams.toString();
    const newUrl = remainingParams ? `?${remainingParams}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
}
// Function to check for video ID in URL and open modal if present
function checkUrlForVideo() {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('frame');
    if (videoId) {
    // Get all video wrappers
    currentVideos = document.querySelectorAll('.video-wrapper');
    if (currentVideos.length > 0) {
        openModal(videoId);
    }
    }
}
// Function to navigate between videos
function navigateVideo(direction) {
    currentVideoIndex = (currentVideoIndex + direction + currentVideos.length) % currentVideos.length;
    const videoId = currentVideos[currentVideoIndex].querySelector('iframe').src.split('?')[0].split('/').pop();
    
    // Update URL preserving filter parameters
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('frame', videoId);
    window.history.replaceState({}, '', `?${urlParams.toString()}`);
    
    updateModalVideo();
}
// Function to update modal video
function updateModalVideo() {
    const modalVideoContainer = document.getElementById('modalVideoContainer');
    const currentVideo = currentVideos[currentVideoIndex];
    const videoId = currentVideo.querySelector('iframe').src.split('?')[0].split('/').pop();
    // Update video metadata
    const number = formatProjectNumber(currentVideo.querySelector('.video-number').textContent.replace(/[\[\]]/g, ''));
    const title = currentVideo.querySelector('.video-title').textContent;
    const companyAndCategory = currentVideo.querySelector('.video-company').textContent;
    document.querySelector('.modal-video-number').textContent = number;
    document.querySelector('.modal-video-title').textContent = title;
    document.querySelector('.modal-video-company').textContent = companyAndCategory;
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&vq=hd1080`;
    iframe.title = "YouTube video player";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    modalVideoContainer.innerHTML = '';
    modalVideoContainer.appendChild(iframe);
    // Update navigation buttons
    document.getElementById('prevButton').disabled = currentVideoIndex === 0;
    document.getElementById('nextButton').disabled = currentVideoIndex === currentVideos.length - 1;
    // Update suggested videos
    updateSuggestedVideos(videoId);
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
    let suggestedVideos = videoData.videos
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