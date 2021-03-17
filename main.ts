import {
    option as Option,
    taskEither as TaskEither,
    io as IO,
    either as Either,
} from 'fp-ts';

import {
    flow,
    pipe
} from 'fp-ts/function';

/* Elements */

const getElement = (id: string) => document.getElementById(id);

const counterElement = getElement('counter');
const fetchImageButton = getElement('fetchImage');
const imageElement = getElement('image') as HTMLImageElement;

/* Logic */

// Gets a cookie that can be present (user has already visited our site)
// or not present (this is the first time that user has visited us)
function getCookie(): Option.Option<string> {
    return Option.fromNullable(
        document.cookie
            .split('; ')
            .find((cookie) => cookie.startsWith('visits='))
    );
}

// Take a cookie (string, 'somecookie=value') and parseInt
// the part after '='. parseInt can return NaN, so we
// add `|| 0` at the end.
function extractNumberFromCookie(cookie): number {
    return parseInt(cookie.split('=')[1], 10) || 0;
}

// Takes Option and folds it to a number
function getSavedVisitCount(maybeCookie: Option.Option<string>): number {
    return pipe(
        maybeCookie,
        Option.fold(
            // If there is no cookie, just fold to 0
            () => 0,
            // If there is a cookie, extract the number from it and fold to this number
            extractNumberFromCookie
        )
    );
}

// Take response and check if it's 200 OK
function validateStatus(response: Response) {
    // `flow` is left-to-right function composition
    return flow(
        // Response can be 200 OK or not (which is an error) and Either monad is used to handle
        // situations where there can be a value or an error (error is always Either.left)
        // Create Either monad
        (response: Response): Either.Either<Error, Response> => {
            return response.ok ? Either.right(response) : Either.left(Error(response.statusText));
        },
        // I just want it to be TaskEither so that it composes better later
        TaskEither.fromEither
    )(response);
}

// blob() is asynchronous and can fail, which makes it a perfect use case for TaskEither monad
// Task monad - asynchronous operation
// Either - operation that can fail
function extractBlob(response: Response) {
    // Create TaskEither monad from an operation that can throw
    return TaskEither.tryCatch(
        // Get blob
        () => response.blob(),
        // Create error if something goes wrong
        Either.toError
    );
}

/* Side effects */

// IO monad is used for impure operations. We wrap them into the monad
// so we can use our whole monadic toolbox (map, fold, chain, etc.) on them
function saveVisitCount(visitCount: number):IO.IO<number> {
    return () => {
        document.cookie = `visits=${visitCount}`;
        return visitCount;
    };
}

function fetchImage() {
    return pipe(
        // Create TaskEither monad from an operation that can throw
        TaskEither.tryCatch(
            // Try calling this server
            () => fetch('https://placedog.net/640/480?random'),
            // Create an error if it fails (because we don't want to deal
            // with the error in this particular place)
            Either.toError
        ),
        // Now pass the resulting TaskEither monad to status validation (if it's 200 OK)
        TaskEither.chain(validateStatus),
        // We have successfully reached the server, and we even got the correct response status,
        // so let's extract our image (blob)!
        TaskEither.chain(extractBlob)
    )();
    // This function returns a Promise with Either monad.
    // Promise - because Task/TaskEither always wrap asynchronous operation
    // Either - because we took care of the async part, but inside we may have
    //          an error or a value (a blob)
}

// Just insert the Blob into DOM
// TODO: this should be an IO monad
function swapImage(newImage: Blob) {
    const dataUrl = URL.createObjectURL(newImage);
    imageElement.src = dataUrl;
}

async function onFetchButtonClick() {
    pipe(
        // get Either monad with an Error or Blob inside
        await fetchImage(),
        // Now decide whether to show error or display the image
        Either.fold(
            // Handle error
            // TODO: alert should be an IO monad
            (error) => alert(`Doggo not found: ${error}`),
            // if no error: do something with the image
            swapImage
        )
    );
}

function setCounterText(number: number): IO.IO<number> {
    return () => {
        counterElement.textContent = String(number);
        return number;
    };
}

/* state */

function incrementVisits(savedVisits: number) {
    return savedVisits + 1;
}

/* main */

(function main() {
    // Compose `updateCounter` from other functions that we
    // already have
    const updateCounter = flow(
        getCookie,
        getSavedVisitCount,
        incrementVisits,
    );

    // Compose some side-effects into one function
    const setCounterAndSave = flow(
        setCounterText,
        IO.chain(saveVisitCount)
    );

    // Run the code
    const updatedCounterState = updateCounter();
    setCounterAndSave(updatedCounterState)();

    fetchImageButton.addEventListener('click', onFetchButtonClick);
})();