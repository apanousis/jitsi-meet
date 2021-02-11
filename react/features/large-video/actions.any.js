// @flow

import type { Dispatch } from 'redux';

import {
    createSelectParticipantFailedEvent,
    sendAnalytics
} from '../analytics';
import logger from '../app/logger';
import { _handleParticipantError } from '../base/conference';
import {
    getLocalParticipant,
    getParticipants, grantModerator,
    isLocalParticipantModerator
} from '../base/participants';
import { reportError } from '../base/util';
import { shouldDisplayTileView } from '../video-layout';

import {
    SELECT_LARGE_VIDEO_PARTICIPANT,
    UPDATE_KNOWN_LARGE_VIDEO_RESOLUTION
} from './actionTypes';

declare var APP: Object;

export const getModerators = state => getParticipants(state)
    .filter(participant => participant.email && participant.email.endsWith('-true'));

/**
 * Signals conference to select a participant.
 *
 * @returns {Function}
 */
export function selectParticipant() {
    return (dispatch: Dispatch<any>, getState: Function) => {
        const state = getState();
        const { conference } = state['features/base/conference'];
        const localParticipantIsModerator = isLocalParticipantModerator(state);

        if (conference) {
            let ids = localParticipantIsModerator ? shouldDisplayTileView(state)
                ? getParticipants(state).map(participant => participant.id)
                : [ state['features/large-video'].participantId ] : [ _electParticipantInLargeVideo(state) ];

            if (ids.length === 0) {
                ids = [ getLocalParticipant(state).id ];
            }

            try {
                conference.selectParticipants(ids);
                dispatch(grantModerator(ids[0]));
            } catch (err) {
                _handleParticipantError(err);

                sendAnalytics(createSelectParticipantFailedEvent(err));

                reportError(
                    err, `Failed to select participants ${ids.toString()}`);
            }
        }
    };
}

/**
 * Action to select the participant to be displayed in LargeVideo based on the
 * participant id provided. If a participant id is not provided, the LargeVideo
 * participant will be selected based on a variety of factors: If there is a
 * dominant or pinned speaker, or if there are remote tracks, etc.
 *
 * @param {string} participant - The participant id of the user that needs to be
 * displayed on the large video.
 * @returns {Function}
 */
export function selectParticipantInLargeVideo(participant: ?string) {
    return (dispatch: Dispatch<any>, getState: Function) => {
        const state = getState();
        const participantId = participant ?? _electParticipantInLargeVideo(state);
        const largeVideo = state['features/large-video'];

        if (participantId !== largeVideo.participantId) {
            dispatch({
                type: SELECT_LARGE_VIDEO_PARTICIPANT,
                participantId
            });

            dispatch(selectParticipant());
        }
    };
}

/**
 * Updates the currently seen resolution of the video displayed on large video.
 *
 * @param {number} resolution - The current resolution (height) of the video.
 * @returns {{
 *     type: UPDATE_KNOWN_LARGE_VIDEO_RESOLUTION,
 *     resolution: number
 * }}
 */
export function updateKnownLargeVideoResolution(resolution: number) {
    return {
        type: UPDATE_KNOWN_LARGE_VIDEO_RESOLUTION,
        resolution
    };
}

/**
 * Returns the identifier of the participant who is to be on the stage and
 * should be displayed in {@code LargeVideo}.
 *
 * @param {Object} state - The Redux state from which the participant to be
 * displayed in {@code LargeVideo} is to be elected.
 * @private
 * @returns {(string|undefined)}
 */
export function _electParticipantInLargeVideo(state) {
    // 1. If a participant is pinned, they will be shown in the LargeVideo (
    //    regardless of whether they are local or remote).
    const participants = getParticipants(state);
    const participant = participants.find(p => p.pinned);
    let id = participant && participant.id;

    logger.info('----- elect pinned', id);

    if (!id) {
        // 2. No participant is pinned so select the dominant moderator
        const moderators = getModerators(state);

        logger.info('----- elect moderators', moderators);

        // find the dominant moderator
        if (moderators && moderators.length > 0) {
            const dominant = moderators?.find(p => p.dominantSpeaker && !p.local);

            if (dominant) {
                id = dominant.id;
            } else {
                id = moderators[0].id;
            }
        }
    }

    // no moderators or pinned found, show the local user
    if (!id) {
        const localParticipant = getLocalParticipant(state);

        if (localParticipant) {
            id = localParticipant.id;
        }
    }

    logger.info('----- elect return id', id);

    return id;
}
