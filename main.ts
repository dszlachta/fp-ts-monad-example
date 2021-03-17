/* Elements */
const getElement = (id: string) => document.getElementById(id);

const counterElement = getElement('counter');
const fetchImageButton = getElement('fetchImage');
const imageElement = getElement('image') as HTMLImageElement;
/* Logic */

function getSavedVisitCount() {
    const visitCookie = document.cookie
        .split('; ')
        .find((cookie) => cookie.startsWith('visits='));

    if (!visitCookie) return 0;

    return parseInt(
        visitCookie.split('=')[1],
        10
    );
}

function saveVisitCount(visitCount) {
    document.cookie = `visits=${visitCount}`;
}

async function fetchImage() {
    const response = await fetch('https://placedog.net/640/480?random');
    return response.blob();
}

function swapImage(newImage) {
    const dataUrl = URL.createObjectURL(newImage);
    imageElement.src = dataUrl;
}

async function onFetchButtonClick() {
    const newImage = await fetchImage();

    swapImage(newImage);
}

(function main() {
    const savedVisits = getSavedVisitCount();
    const incrementedVisits = String(savedVisits + 1);
    counterElement.textContent = incrementedVisits;
    saveVisitCount(incrementedVisits);

    fetchImageButton.addEventListener('click', onFetchButtonClick);
})();