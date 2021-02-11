/* global APP */
// @flow

import VideoLayout from '../../../modules/UI/videolayout/VideoLayout';
import { getLocalParticipant, isLocalParticipantModerator } from '../base/participants';
import { StateListenerRegistry } from '../base/redux';

import { getModerators } from './actions';

/**
 * Updates the on stage participant video.
 */
StateListenerRegistry.register(
    /* selector */ state => state['features/large-video'].participantId,
    /* listener */ participantId => {
        const state = APP.store.getState();
        let selectedParticipantId = participantId;
        const isParticipantModerator = isLocalParticipantModerator(state);

        if (!isParticipantModerator) {
            const moderators = getModerators(state);

            if (moderators.length === 0) {
                selectedParticipantId = getLocalParticipant(state).id;
            }
        }

        VideoLayout.updateLargeVideo(selectedParticipantId, true);
    }
);
