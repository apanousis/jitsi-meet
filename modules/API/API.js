// @flow

import Logger from 'jitsi-meet-logger';

import * as JitsiMeetConferenceEvents from '../../ConferenceEvents';
import {
    createApiEvent,
    sendAnalytics
} from '../../react/features/analytics';
import {
    sendTones,
    setSubject
} from '../../react/features/base/conference';
import {
    processExternalDeviceRequest
} from '../../react/features/device-selection/functions';
import { setE2EEKey } from '../../react/features/e2ee';
import { muteAllParticipants } from '../../react/features/remote-video-menu/actions';
import { toggleTileView } from '../../react/features/video-layout';
import { setVideoQuality } from '../../react/features/video-quality';
import { getJitsiMeetTransport } from '../transport';

const logger = Logger.getLogger(__filename);

declare var APP: Object;

/**
 * List of the available commands.
 */
let commands = {};

/**
 * The state of screen sharing(started/stopped) before the screen sharing is
 * enabled and initialized.
 * NOTE: This flag help us to cache the state and use it if toggle-share-screen
 * was received before the initialization.
 */
let initialScreenSharingState = false;

/**
 * The transport instance used for communication with external apps.
 *
 * @type {Transport}
 */
const transport = getJitsiMeetTransport();

/**
 * The current audio availability.
 *
 * @type {boolean}
 */
let audioAvailable = true;

/**
 * The current video availability.
 *
 * @type {boolean}
 */
let videoAvailable = true;

/**
 * Initializes supported commands.
 *
 * @returns {void}
 */
function initCommands() {
    commands = {
        'display-name': displayName => {
            sendAnalytics(createApiEvent('display.name.changed'));
            APP.conference.changeLocalDisplayName(displayName);
        },
        'mute-everyone': () => {
            sendAnalytics(createApiEvent('muted-everyone'));
            const participants = APP.store.getState()['features/base/participants'];
            const localIds = participants
                .filter(participant => participant.local)
                .filter(participant => participant.role === 'moderator')
                .map(participant => participant.id);

            APP.store.dispatch(muteAllParticipants(localIds));
        },
        'proxy-connection-event': event => {
            APP.conference.onProxyConnectionEvent(event);
        },
        'send-tones': (options = {}) => {
            const { duration, tones, pause } = options;

            APP.store.dispatch(sendTones(tones, duration, pause));
        },
        'subject': subject => {
            sendAnalytics(createApiEvent('subject.changed'));
            APP.store.dispatch(setSubject(subject));
        },
        'submit-feedback': feedback => {
            sendAnalytics(createApiEvent('submit.feedback'));
            APP.conference.submitFeedback(feedback.score, feedback.message);
        },
        'toggle-audio': () => {
            sendAnalytics(createApiEvent('toggle-audio'));
            logger.log('Audio toggle: API command received');
            APP.conference.toggleAudioMuted(false /* no UI */);
        },
        'toggle-video': () => {
            sendAnalytics(createApiEvent('toggle-video'));
            logger.log('Video toggle: API command received');
            APP.conference.toggleVideoMuted(false /* no UI */);
        },
        'toggle-film-strip': () => {
            sendAnalytics(createApiEvent('film.strip.toggled'));
            APP.UI.toggleFilmstrip();
        },
        'toggle-tile-view': () => {
            sendAnalytics(createApiEvent('tile-view.toggled'));

            APP.store.dispatch(toggleTileView());
        },
        'video-hangup': (showFeedbackDialog = true) => {
            sendAnalytics(createApiEvent('video.hangup'));
            APP.conference.hangup(showFeedbackDialog);
        },
        'email': email => {
            sendAnalytics(createApiEvent('email.changed'));
            APP.conference.changeLocalEmail(email);
        },
        'avatar-url': avatarUrl => {
            sendAnalytics(createApiEvent('avatar.url.changed'));
            APP.conference.changeLocalAvatarUrl(avatarUrl);
        },
        'e2ee-key': key => {
            logger.debug('Set E2EE key command received');
            APP.store.dispatch(setE2EEKey(key));
        },
        'set-video-quality': frameHeight => {
            logger.debug('Set video quality command received');
            sendAnalytics(createApiEvent('set.video.quality'));
            APP.store.dispatch(setVideoQuality(frameHeight));
        }
    };
    transport.on('event', ({ data, name }) => {
        if (name && commands[name]) {
            commands[name](...data);

            return true;
        }

        return false;
    });
    transport.on('request', (request, callback) => {
        const { dispatch, getState } = APP.store;

        if (processExternalDeviceRequest(dispatch, getState, request, callback)) {
            return true;
        }

        const { name } = request;

        switch (name) {
        case 'is-audio-muted':
            callback(APP.conference.isLocalAudioMuted());
            break;
        case 'is-video-muted':
            callback(APP.conference.isLocalVideoMuted());
            break;
        case 'is-audio-available':
            callback(audioAvailable);
            break;
        case 'is-video-available':
            callback(videoAvailable);
            break;
        case 'is-sharing-screen':
            callback(Boolean(APP.conference.isSharingScreen));
            break;
        default:
            return false;
        }

        return true;
    });
}

/**
 * Listens for desktop/screen sharing enabled events and toggles the screen
 * sharing if needed.
 *
 * @param {boolean} enabled - Current screen sharing enabled status.
 * @returns {void}
 */
function onDesktopSharingEnabledChanged(enabled = false) {
    if (enabled && initialScreenSharingState) {
        toggleScreenSharing();
    }
}

/**
 * Executes on toggle-share-screen command.
 *
 * @param {boolean} [enable] - Whether this toggle is to explicitly enable or
 * disable screensharing. If not defined, the application will automatically
 * attempt to toggle between enabled and disabled. This boolean is useful for
 * explicitly setting desired screensharing state.
 * @returns {void}
 */
function toggleScreenSharing(enable) {
    if (APP.conference.isDesktopSharingEnabled) {

        // eslint-disable-next-line no-empty-function
        APP.conference.toggleScreenSharing(enable).catch(() => {});
    } else {
        initialScreenSharingState = !initialScreenSharingState;
    }
}

/**
 * Implements API class that communicates with external API class and provides
 * interface to access Jitsi Meet features by external applications that embed
 * Jitsi Meet.
 */
class API {
    _enabled: boolean;

    /**
     * Initializes the API. Setups message event listeners that will receive
     * information from external applications that embed Jitsi Meet. It also
     * sends a message to the external application that API is initialized.
     *
     * @param {Object} options - Optional parameters.
     * @returns {void}
     */
    init() {

        /**
         * Current status (enabled/disabled) of API.
         *
         * @private
         * @type {boolean}
         */
        this._enabled = true;

        initCommands();
    }

    /**
     * Notify external application (if API is enabled) that the large video
     * visibility changed.
     *
     * @param {boolean} isHidden - True if the large video is hidden and false
     * otherwise.
     * @returns {void}
     */
    notifyLargeVideoVisibilityChanged(isHidden: boolean) {
        this._sendEvent({
            name: 'large-video-visibility-changed',
            isVisible: !isHidden
        });
    }

    /**
     * Notifies the external application (spot) that the local jitsi-participant
     * has a status update.
     *
     * @param {Object} event - The message to pass onto spot.
     * @returns {void}
     */
    sendProxyConnectionEvent(event: Object) {
        this._sendEvent({
            name: 'proxy-connection-event',
            ...event
        });
    }

    /**
     * Sends event to the external application.
     *
     * @param {Object} event - The event to be sent.
     * @returns {void}
     */
    _sendEvent(event: Object = {}) {
        if (this._enabled) {
            transport.sendEvent(event);
        }
    }

    /**
     * Notify external application that the video quality setting has changed.
     *
     * @param {number} videoQuality - The video quality. The number represents the maximum height of the video streams.
     * @returns {void}
     */
    notifyVideoQualityChanged(videoQuality: number) {
        this._sendEvent({
            name: 'video-quality-changed',
            videoQuality
        });
    }

    /**
     * Notify external application (if API is enabled) that user joined the
     * conference.
     *
     * @param {string} id - User id.
     * @param {Object} props - The display name of the user.
     * @returns {void}
     */
    notifyUserJoined(id: string, props: Object) {
        this._sendEvent({
            name: 'participant-joined',
            id,
            ...props
        });
    }

    /**
     * Notify external application (if API is enabled) that user left the
     * conference.
     *
     * @param {string} id - User id.
     * @returns {void}
     */
    notifyUserLeft(id: string) {
        this._sendEvent({
            name: 'participant-left',
            id
        });
    }

    /**
     * Notify external application (if API is enabled) that the user role
     * has changed.
     *
     * @param {string} id - User id.
     * @param {string} role - The new user role.
     * @returns {void}
     */
    notifyUserRoleChanged(id: string, role: string) {
        this._sendEvent({
            name: 'participant-role-changed',
            id,
            role
        });
    }

    /**
     * Notify external application (if API is enabled) that user changed their
     * avatar.
     *
     * @param {string} id - User id.
     * @param {string} avatarURL - The new avatar URL of the participant.
     * @returns {void}
     */
    notifyAvatarChanged(id: string, avatarURL: string) {
        this._sendEvent({
            name: 'avatar-changed',
            avatarURL,
            id
        });
    }

    /**
     * Notify external application (if API is enabled) that user received
     * a text message through datachannels.
     *
     * @param {Object} data - The event data.
     * @returns {void}
     */
    notifyEndpointTextMessageReceived(data: Object) {
        this._sendEvent({
            name: 'endpoint-text-message-received',
            data
        });
    }

    /**
     * Notify external application (if API is enabled) that the device list has
     * changed.
     *
     * @param {Object} devices - The new device list.
     * @returns {void}
     */
    notifyDeviceListChanged(devices: Object) {
        this._sendEvent({
            name: 'device-list-changed',
            devices
        });
    }

    /**
     * Notify external application (if API is enabled) that user changed their
     * nickname.
     *
     * @param {string} id - User id.
     * @param {string} displayname - User nickname.
     * @param {string} formattedDisplayName - The display name shown in Jitsi
     * meet's UI for the user.
     * @returns {void}
     */
    notifyDisplayNameChanged(
            id: string,
            { displayName, formattedDisplayName }: Object) {
        this._sendEvent({
            name: 'display-name-change',
            displayname: displayName,
            formattedDisplayName,
            id
        });
    }

    /**
     * Notify external application (if API is enabled) that user changed their
     * email.
     *
     * @param {string} id - User id.
     * @param {string} email - The new email of the participant.
     * @returns {void}
     */
    notifyEmailChanged(
            id: string,
            { email }: Object) {
        this._sendEvent({
            name: 'email-change',
            email,
            id
        });
    }

    /**
     * Notify external application (if API is enabled) that the conference has
     * been joined.
     *
     * @param {string} roomName - The room name.
     * @param {string} id - The id of the local user.
     * @param {Object} props - The display name and avatar URL of the local
     * user.
     * @returns {void}
     */
    notifyConferenceJoined(roomName: string, id: string, props: Object) {
        this._sendEvent({
            name: 'video-conference-joined',
            roomName,
            id,
            ...props
        });
    }

    /**
     * Notify external application (if API is enabled) that user changed their
     * nickname.
     *
     * @param {string} roomName - User id.
     * @returns {void}
     */
    notifyConferenceLeft(roomName: string) {
        this._sendEvent({
            name: 'video-conference-left',
            roomName
        });
    }

    /**
     * Notify external application (if API is enabled) that we are ready to be
     * closed.
     *
     * @returns {void}
     */
    notifyReadyToClose() {
        this._sendEvent({ name: 'video-ready-to-close' });
    }

    /**
     * Notify external application (if API is enabled) that a suspend event in host computer.
     *
     * @returns {void}
     */
    notifySuspendDetected() {
        this._sendEvent({ name: 'suspend-detected' });
    }

    /**
     * Notify external application (if API is enabled) for audio muted status
     * changed.
     *
     * @param {boolean} muted - The new muted status.
     * @returns {void}
     */
    notifyAudioMutedStatusChanged(muted: boolean) {
        this._sendEvent({
            name: 'audio-mute-status-changed',
            muted
        });
    }

    /**
     * Notify external application (if API is enabled) for video muted status
     * changed.
     *
     * @param {boolean} muted - The new muted status.
     * @returns {void}
     */
    notifyVideoMutedStatusChanged(muted: boolean) {
        this._sendEvent({
            name: 'video-mute-status-changed',
            muted
        });
    }

    /**
     * Notify external application (if API is enabled) for audio availability
     * changed.
     *
     * @param {boolean} available - True if available and false otherwise.
     * @returns {void}
     */
    notifyAudioAvailabilityChanged(available: boolean) {
        audioAvailable = available;
        this._sendEvent({
            name: 'audio-availability-changed',
            available
        });
    }

    /**
     * Notify external application (if API is enabled) for video available
     * status changed.
     *
     * @param {boolean} available - True if available and false otherwise.
     * @returns {void}
     */
    notifyVideoAvailabilityChanged(available: boolean) {
        videoAvailable = available;
        this._sendEvent({
            name: 'video-availability-changed',
            available
        });
    }

    /**
     * Notify external application (if API is enabled) that the on stage
     * participant has changed.
     *
     * @param {string} id - User id of the new on stage participant.
     * @returns {void}
     */
    notifyOnStageParticipantChanged(id: string) {
        this._sendEvent({
            name: 'on-stage-participant-changed',
            id
        });
    }

    /**
     * Notify external application of an unexpected camera-related error having
     * occurred.
     *
     * @param {string} type - The type of the camera error.
     * @param {string} message - Additional information about the error.
     * @returns {void}
     */
    notifyOnCameraError(type: string, message: string) {
        this._sendEvent({
            name: 'camera-error',
            type,
            message
        });
    }

    /**
     * Notify external application of an unexpected mic-related error having
     * occurred.
     *
     * @param {string} type - The type of the mic error.
     * @param {string} message - Additional information about the error.
     * @returns {void}
     */
    notifyOnMicError(type: string, message: string) {
        this._sendEvent({
            name: 'mic-error',
            type,
            message
        });
    }

    /**
     * Notify external application (if API is enabled) that conference feedback
     * has been submitted. Intended to be used in conjunction with the
     * submit-feedback command to get notified if feedback was submitted.
     *
     * @param {string} error - A failure message, if any.
     * @returns {void}
     */
    notifyFeedbackSubmitted(error: string) {
        this._sendEvent({
            name: 'feedback-submitted',
            error
        });
    }

    /**
     * Notify external application (if API is enabled) that the feedback prompt
     * has been displayed.
     *
     * @returns {void}
     */
    notifyFeedbackPromptDisplayed() {
        this._sendEvent({ name: 'feedback-prompt-displayed' });
    }

    /**
     * Notify external application (if API is enabled) that the display
     * configuration of the filmstrip has been changed.
     *
     * @param {boolean} visible - Whether or not the filmstrip has been set to
     * be displayed or hidden.
     * @returns {void}
     */
    notifyFilmstripDisplayChanged(visible: boolean) {
        this._sendEvent({
            name: 'filmstrip-display-changed',
            visible
        });
    }

    /**
     * Notify external application of a participant, remote or local, being
     * removed from the conference by another participant.
     *
     * @param {string} kicked - The ID of the participant removed from the
     * conference.
     * @param {string} kicker - The ID of the participant that removed the
     * other participant.
     * @returns {void}
     */
    notifyKickedOut(kicked: Object, kicker: Object) {
        this._sendEvent({
            name: 'participant-kicked-out',
            kicked,
            kicker
        });
    }

    /**
     * Notify external application of the current meeting requiring a password
     * to join.
     *
     * @returns {void}
     */
    notifyOnPasswordRequired() {
        this._sendEvent({ name: 'password-required' });
    }

    /**
     * Notify external application (if API is enabled) that the screen sharing
     * has been turned on/off.
     *
     * @param {boolean} on - True if screen sharing is enabled.
     * @param {Object} details - Additional information about the screen
     * sharing.
     * @param {string} details.sourceType - Type of device or window the screen
     * share is capturing.
     * @returns {void}
     */
    notifyScreenSharingStatusChanged(on: boolean, details: Object) {
        this._sendEvent({
            name: 'screen-sharing-status-changed',
            on,
            details
        });
    }

    /**
     * Notify external application (if API is enabled) that the dominant speaker
     * has been turned on/off.
     *
     * @param {string} id - Id of the dominant participant.
     * @returns {void}
     */
    notifyDominantSpeakerChanged(id: string) {
        this._sendEvent({
            name: 'dominant-speaker-changed',
            id
        });
    }

    /**
     * Notify external application (if API is enabled) that the conference
     * changed their subject.
     *
     * @param {string} subject - Conference subject.
     * @returns {void}
     */
    notifySubjectChanged(subject: string) {
        this._sendEvent({
            name: 'subject-change',
            subject
        });
    }

    /**
     * Notify external application (if API is enabled) that tile view has been
     * entered or exited.
     *
     * @param {string} enabled - True if tile view is currently displayed, false
     * otherwise.
     * @returns {void}
     */
    notifyTileViewChanged(enabled: boolean) {
        this._sendEvent({
            name: 'tile-view-changed',
            enabled
        });
    }

    /**
     * Disposes the allocated resources.
     *
     * @returns {void}
     */
    dispose() {
        if (this._enabled) {
            this._enabled = false;
            APP.conference.removeListener(
                JitsiMeetConferenceEvents.DESKTOP_SHARING_ENABLED_CHANGED,
                onDesktopSharingEnabledChanged);
        }
    }
}

export default new API();
