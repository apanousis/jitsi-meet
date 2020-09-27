// @flow

import type { Dispatch } from 'redux';

import { getInviteURL } from '../base/connection';
import { getParticipants } from '../base/participants';
import { inviteVideoRooms } from '../videosipgw';

import {
    ADD_PENDING_INVITE_REQUEST,
    BEGIN_ADD_PEOPLE,
    HIDE_ADD_PEOPLE_DIALOG,
    REMOVE_PENDING_INVITE_REQUESTS,
    SET_CALLEE_INFO_VISIBLE,
    UPDATE_DIAL_IN_NUMBERS_FAILED,
    UPDATE_DIAL_IN_NUMBERS_SUCCESS
} from './actionTypes';
import {
    getDialInConferenceID,
    getDialInNumbers
} from './functions';
import logger from './logger';

/**
 * Creates a (redux) action to signal that a click/tap has been performed on
 * {@link InviteButton} and that the execution flow for adding/inviting people
 * to the current conference/meeting is to begin.
 *
 * @returns {{
 *     type: BEGIN_ADD_PEOPLE
 * }}
 */
export function beginAddPeople() {
    return {
        type: BEGIN_ADD_PEOPLE
    };
}

/**
 * Creates a (redux) action to signal that the {@code AddPeopleDialog}
 * should close.
 *
 * @returns {{
 *     type: HIDE_ADD_PEOPLE_DIALOG
 * }}
 */
export function hideAddPeopleDialog() {
    return {
        type: HIDE_ADD_PEOPLE_DIALOG
    };
}

/**
 * Sends AJAX requests for dial-in numbers and conference ID.
 *
 * @returns {Function}
 */
export function updateDialInNumbers() {
    return (dispatch: Dispatch<any>, getState: Function) => {
        const state = getState();
        const { dialInConfCodeUrl, dialInNumbersUrl, hosts }
            = state['features/base/config'];
        const { numbersFetched } = state['features/invite'];
        const mucURL = hosts && hosts.muc;

        if (numbersFetched || !dialInConfCodeUrl || !dialInNumbersUrl || !mucURL) {
            // URLs for fetching dial in numbers not defined
            return;
        }

        const { room } = state['features/base/conference'];

        Promise.all([
            getDialInNumbers(dialInNumbersUrl, room, mucURL),
            getDialInConferenceID(dialInConfCodeUrl, room, mucURL)
        ])
            .then(([ dialInNumbers, { conference, id, message } ]) => {
                if (!conference || !id) {
                    return Promise.reject(message);
                }

                dispatch({
                    type: UPDATE_DIAL_IN_NUMBERS_SUCCESS,
                    conferenceID: id,
                    dialInNumbers
                });
            })
            .catch(error => {
                dispatch({
                    type: UPDATE_DIAL_IN_NUMBERS_FAILED,
                    error
                });
            });
    };
}

/**
 * Sets the visibility of {@code CalleeInfo}.
 *
 * @param {boolean|undefined} [calleeInfoVisible] - If {@code CalleeInfo} is
 * to be displayed/visible, then {@code true}; otherwise, {@code false} or
 * {@code undefined}.
 * @param {Object|undefined} [initialCalleeInfo] - Callee information.
 * @returns {{
 *     type: SET_CALLEE_INFO_VISIBLE,
 *     calleeInfoVisible: (boolean|undefined),
 *     initialCalleeInfo
 * }}
 */
export function setCalleeInfoVisible(
        calleeInfoVisible: boolean,
        initialCalleeInfo: ?Object) {
    return {
        type: SET_CALLEE_INFO_VISIBLE,
        calleeInfoVisible,
        initialCalleeInfo
    };
}

/**
 * Adds pending invite request.
 *
 * @param {Object} request - The request.
 * @returns {{
 *     type: ADD_PENDING_INVITE_REQUEST,
 *     request: Object
 * }}
 */
export function addPendingInviteRequest(
        request: { invitees: Array<Object>, callback: Function }) {
    return {
        type: ADD_PENDING_INVITE_REQUEST,
        request
    };
}

/**
 * Removes all pending invite requests.
 *
 * @returns {{
 *     type: REMOVE_PENDING_INVITE_REQUEST
 * }}
 */
export function removePendingInviteRequests() {
    return {
        type: REMOVE_PENDING_INVITE_REQUESTS
    };
}
