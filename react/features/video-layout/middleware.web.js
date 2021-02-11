// @flow

import VideoLayout from '../../../modules/UI/videolayout/VideoLayout.js';
import { CONFERENCE_WILL_LEAVE } from '../base/conference';
import { MEDIA_TYPE } from '../base/media';
import {
    DOMINANT_SPEAKER_CHANGED,
    PARTICIPANT_JOINED,
    PARTICIPANT_LEFT,
    PARTICIPANT_UPDATED,
    PIN_PARTICIPANT,
    getParticipantById,
    isLocalParticipantModerator,
    isParticipantModerator,
    getParticipants,
    participantCanBeSeen
} from '../base/participants';
import { MiddlewareRegistry } from '../base/redux';
import { TRACK_ADDED, TRACK_REMOVED } from '../base/tracks';
import { SET_FILMSTRIP_VISIBLE } from '../filmstrip';

import './middleware.any';

declare var APP: Object;

/**
 * Middleware which intercepts actions and updates the legacy component
 * {@code VideoLayout} as needed. The purpose of this middleware is to redux-ify
 * {@code VideoLayout} without having to simultaneously react-ifying it.
 *
 * @param {Store} store - The redux store.
 * @returns {Function}
 */
// eslint-disable-next-line no-unused-vars
MiddlewareRegistry.register(store => next => action => {
    // Purposefully perform additional actions after state update to mimic
    // being connected to the store for updates.
    const result = next(action);

    switch (action.type) {
    case CONFERENCE_WILL_LEAVE:
        VideoLayout.reset();
        break;

    case PARTICIPANT_JOINED:
        // eslint-disable-next-line no-case-declarations
        const participant = getParticipantById(store.getState(), action.participant.id);

        if (!action.participant.local && (isLocalParticipantModerator(store.getState())
            || isParticipantModerator(participant))) {
            VideoLayout.addRemoteParticipantContainer(participant);
        }

        break;

    case PARTICIPANT_LEFT:
        VideoLayout.removeParticipantContainer(action.participant.id);
        break;

    case PARTICIPANT_UPDATED: {

        if (action.participant.email && action.participant.id) {
            if (action.participant.onlyEmail) {
                if (participantCanBeSeen(store.getState(), action.participant)) {

                    // In case of reconnection remove old window
                    const limboParticipant = getParticipants(store.getState())
                        .find(p => p.email === action.participant.email
                            && p.id !== action.participant.id);

                    if (limboParticipant) {
                        VideoLayout.removeParticipantContainer(limboParticipant.id);
                    }

                    VideoLayout.addRemoteParticipantContainer(action.participant);
                } else {
                    VideoLayout.removeParticipantContainer(action.participant.id);
                }
            }
        }

        if (typeof action.participant.connectionStatus !== 'undefined') {
            VideoLayout.onParticipantConnectionStatusChanged(
                action.participant.id,
                action.participant.connectionStatus);
        }
        break;
    }

    case DOMINANT_SPEAKER_CHANGED:
        VideoLayout.onDominantSpeakerChanged(action.participant.id);
        break;

    case PIN_PARTICIPANT:
        VideoLayout.onPinChange(action.participant?.id);
        break;

    case SET_FILMSTRIP_VISIBLE:
        VideoLayout.resizeVideoArea();
        break;

    case TRACK_ADDED:
        if (!action.track.local && action.track.mediaType !== MEDIA_TYPE.AUDIO) {
            VideoLayout.onRemoteStreamAdded(action.track.jitsiTrack);
        }

        break;
    case TRACK_REMOVED:
        if (!action.track.local && action.track.mediaType !== MEDIA_TYPE.AUDIO) {
            VideoLayout.onRemoteStreamRemoved(action.track.jitsiTrack);
        }

        break;
    }

    return result;
});
