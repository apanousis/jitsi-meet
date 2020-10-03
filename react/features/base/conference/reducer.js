// @flow

import { CONNECTION_WILL_CONNECT, SET_LOCATION_URL } from '../connection';
import { JitsiConferenceErrors } from '../lib-jitsi-meet';
import { assign, ReducerRegistry, set } from '../redux';

import {
    CONFERENCE_FAILED,
    CONFERENCE_JOINED,
    CONFERENCE_LEFT,
    CONFERENCE_SUBJECT_CHANGED,
    CONFERENCE_TIMESTAMP_CHANGED,
    CONFERENCE_WILL_JOIN,
    CONFERENCE_WILL_LEAVE,
    P2P_STATUS_CHANGED,
    SET_DESKTOP_SHARING_ENABLED,
    SET_FOLLOW_ME,
    SET_PENDING_SUBJECT_CHANGE,
    SET_ROOM,
    SET_SIP_GATEWAY_ENABLED,
    SET_START_MUTED_POLICY
} from './actionTypes';
import { isRoomValid } from './functions';

const DEFAULT_STATE = {
    conference: undefined,
    e2eeSupported: undefined,
    joining: undefined,
    leaving: undefined,
    membersOnly: undefined,
    password: undefined,
    passwordRequired: undefined
};

/**
 * Listen for actions that contain the conference object, so that it can be
 * stored for use by other action creators.
 */
ReducerRegistry.register(
    'features/base/conference',
    (state = DEFAULT_STATE, action) => {
        switch (action.type) {

        case CONFERENCE_FAILED:
            return _conferenceFailed(state, action);

        case CONFERENCE_JOINED:
            return _conferenceJoined(state, action);

        case CONFERENCE_SUBJECT_CHANGED:
            return set(state, 'subject', action.subject);

        case CONFERENCE_TIMESTAMP_CHANGED:
            return set(state, 'conferenceTimestamp', action.conferenceTimestamp);

        case CONFERENCE_LEFT:
        case CONFERENCE_WILL_LEAVE:
            return _conferenceLeftOrWillLeave(state, action);

        case CONFERENCE_WILL_JOIN:
            return _conferenceWillJoin(state, action);

        case CONNECTION_WILL_CONNECT:
            return set(state, 'authRequired', undefined);

        case P2P_STATUS_CHANGED:
            return _p2pStatusChanged(state, action);

        case SET_DESKTOP_SHARING_ENABLED:
            return _setDesktopSharingEnabled(state, action);

        case SET_FOLLOW_ME:
            return set(state, 'followMeEnabled', action.enabled);

        case SET_LOCATION_URL:
            return set(state, 'room', undefined);

        case SET_PENDING_SUBJECT_CHANGE:
            return set(state, 'pendingSubjectChange', action.subject);

        case SET_ROOM:
            return _setRoom(state, action);

        case SET_SIP_GATEWAY_ENABLED:
            return _setSIPGatewayEnabled(state, action);

        case SET_START_MUTED_POLICY:
            return {
                ...state,
                startAudioMutedPolicy: action.startAudioMutedPolicy,
                startVideoMutedPolicy: action.startVideoMutedPolicy
            };
        }

        return state;
    });

/**
 * Reduces a specific Redux action CONFERENCE_FAILED of the feature
 * base/conference.
 *
 * @param {Object} state - The Redux state of the feature base/conference.
 * @param {Action} action - The Redux action CONFERENCE_FAILED to reduce.
 * @private
 * @returns {Object} The new state of the feature base/conference after the
 * reduction of the specified action.
 */
function _conferenceFailed(state, { conference, error }) {
    // The current (similar to getCurrentConference in
    // base/conference/functions.js) conference which is joining or joined:
    const conference_ = state.conference || state.joining;

    if (conference_ && conference_ !== conference) {
        return state;
    }

    let authRequired;
    let membersOnly;
    let passwordRequired;

    switch (error.name) {
    case JitsiConferenceErrors.AUTHENTICATION_REQUIRED:
        authRequired = conference;
        break;

    case JitsiConferenceErrors.CONFERENCE_ACCESS_DENIED:
    case JitsiConferenceErrors.MEMBERS_ONLY_ERROR:
        membersOnly = conference;
        break;

    case JitsiConferenceErrors.PASSWORD_REQUIRED:
        passwordRequired = conference;
        break;
    }

    return assign(state, {
        authRequired,
        conference: undefined,
        e2eeSupported: undefined,
        error,
        joining: undefined,
        leaving: undefined,

        membersOnly,
        password: undefined,

        /**
         * The JitsiConference instance which requires a password to join.
         *
         * @type {JitsiConference}
         */
        passwordRequired
    });
}

/**
 * Reduces a specific Redux action CONFERENCE_JOINED of the feature
 * base/conference.
 *
 * @param {Object} state - The Redux state of the feature base/conference.
 * @param {Action} action - The Redux action CONFERENCE_JOINED to reduce.
 * @private
 * @returns {Object} The new state of the feature base/conference after the
 * reduction of the specified action.
 */
function _conferenceJoined(state, { conference }) {

    return assign(state, {
        authRequired: undefined,

        /**
         * The JitsiConference instance represented by the Redux state of the
         * feature base/conference.
         *
         * @type {JitsiConference}
         */
        conference,

        e2eeSupported: conference.isE2EESupported(),

        joining: undefined,
        membersOnly: undefined,
        leaving: undefined,
        passwordRequired: undefined
    });
}

/**
 * Reduces a specific redux action {@link CONFERENCE_LEFT} or
 * {@link CONFERENCE_WILL_LEAVE} for the feature base/conference.
 *
 * @param {Object} state - The redux state of the feature base/conference.
 * @param {Action} action - The redux action {@code CONFERENCE_LEFT} or
 * {@code CONFERENCE_WILL_LEAVE} to reduce.
 * @private
 * @returns {Object} The next/new state of the feature base/conference after the
 * reduction of the specified action.
 */
function _conferenceLeftOrWillLeave(state, { conference, type }) {
    const nextState = { ...state };

    // The redux action CONFERENCE_LEFT is the last time that we should be
    // hearing from a JitsiConference instance.
    //
    // The redux action CONFERENCE_WILL_LEAVE represents the order of the user
    // to leave a JitsiConference instance. From the user's perspective, there's
    // no going back (with respect to the instance itself). The app will perform
    // due clean-up like leaving the associated room, but the instance is no
    // longer the focus of the attention of the user and, consequently, the app.
    for (const p in state) {
        if (state[p] === conference) {
            nextState[p] = undefined;

            switch (p) {
            case 'conference':
            case 'passwordRequired':
                delete nextState.password;
                break;
            }
        }
    }

    if (type === CONFERENCE_WILL_LEAVE) {
        // A CONFERENCE_WILL_LEAVE is of further consequence only if it is
        // expected i.e. if the specified conference is joining or joined.
        if (conference === state.joining || conference === state.conference) {
            /**
             * The JitsiConference instance which is currently in the process of
             * being left.
             *
             * @type {JitsiConference}
             */
            nextState.leaving = conference;
        }
    }

    return nextState;
}

/**
 * Reduces a specific Redux action CONFERENCE_WILL_JOIN of the feature
 * base/conference.
 *
 * @param {Object} state - The Redux state of the feature base/conference.
 * @param {Action} action - The Redux action CONFERENCE_WILL_JOIN to reduce.
 * @private
 * @returns {Object} The new state of the feature base/conference after the
 * reduction of the specified action.
 */
function _conferenceWillJoin(state, { conference }) {
    return assign(state, {
        error: undefined,
        joining: conference
    });
}


/**
 * Reduces a specific Redux action P2P_STATUS_CHANGED of the feature
 * base/conference.
 *
 * @param {Object} state - The Redux state of the feature base/conference.
 * @param {Action} action - The Redux action P2P_STATUS_CHANGED to reduce.
 * @private
 * @returns {Object} The new state of the feature base/conference after the
 * reduction of the specified action.
 */
function _p2pStatusChanged(state, action) {
    return set(state, 'p2p', action.p2p);
}

/**
 * Reduces a specific Redux action SET_DESKTOP_SHARING_ENABLED of the feature
 * base/conference.
 *
 * @param {Object} state - The Redux state of the feature base/conference.
 * @param {Action} action - The Redux action SET_DESKTOP_SHARING_ENABLED to
 * reduce.
 * @private
 * @returns {Object} The new state of the feature base/conference after the
 * reduction of the specified action.
 */
function _setDesktopSharingEnabled(state, action) {
    return set(state, 'desktopSharingEnabled', action.desktopSharingEnabled);
}

/**
 * Reduces a specific Redux action SET_ROOM of the feature base/conference.
 *
 * @param {Object} state - The Redux state of the feature base/conference.
 * @param {Action} action - The Redux action SET_ROOM to reduce.
 * @private
 * @returns {Object} The new state of the feature base/conference after the
 * reduction of the specified action.
 */
function _setRoom(state, action) {
    let { room } = action;

    if (!isRoomValid(room)) {
        // Technically, there are multiple values which don't represent valid
        // room names. Practically, each of them is as bad as the rest of them
        // because we can't use any of them to join a conference.
        room = undefined;
    }

    /**
     * The name of the room of the conference (to be) joined.
     *
     * @type {string}
     */
    return assign(state, {
        error: undefined,
        room
    });
}

/**
 * Reduces a specific Redux action SET_SIP_GATEWAY_ENABLED of the feature
 * base/conference.
 *
 * @param {Object} state - The Redux state of the feature base/conference.
 * @param {Action} action - The Redux action SET_SIP_GATEWAY_ENABLED to reduce.
 * @private
 * @returns {Object} The new state of the feature base/conference after the
 * reduction of the specified action.
 */
function _setSIPGatewayEnabled(state, action) {
    return set(state, 'isSIPGatewayEnabled', action.isSIPGatewayEnabled);
}
