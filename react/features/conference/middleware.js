// @flow
import { appNavigate } from '../app/actions';
import {
    CONFERENCE_JOINED,
    KICKED_OUT,
    conferenceLeft,
    getCurrentConference
} from '../base/conference';
import { hideDialog, isDialogOpen } from '../base/dialog';
import { setActiveModalId } from '../base/modal';
import { pinParticipant } from '../base/participants';
import { MiddlewareRegistry, StateListenerRegistry } from '../base/redux';
import { SET_REDUCED_UI } from '../base/responsive-ui';
import { setFilmstripEnabled } from '../filmstrip';
import { setToolboxEnabled } from '../toolbox/actions';

import { notifyKickedOut } from './actions';

MiddlewareRegistry.register(store => next => action => {
    const result = next(action);

    switch (action.type) {
    case CONFERENCE_JOINED:
    case SET_REDUCED_UI: {
        const { dispatch, getState } = store;
        const state = getState();
        const { reducedUI } = state['features/base/responsive-ui'];

        dispatch(setToolboxEnabled(!reducedUI));
        dispatch(setFilmstripEnabled(!reducedUI));

        break;
    }

    case KICKED_OUT: {
        const { dispatch } = store;

        dispatch(notifyKickedOut(
            action.participant,
            () => {
                dispatch(conferenceLeft(action.conference));
                dispatch(appNavigate(undefined));
            }
        ));

        break;
    }
    }

    return result;
});

/**
 * Set up state change listener to perform maintenance tasks when the conference
 * is left or failed, close all dialogs and unpin any pinned participants.
 */
StateListenerRegistry.register(
    state => getCurrentConference(state),
    (conference, { dispatch, getState }, prevConference) => {
        if (conference !== prevConference) {
            // Unpin participant, in order to avoid the local participant
            // remaining pinned, since it's not destroyed across runs.
            dispatch(pinParticipant(null));

            // We want to close all modals.
            dispatch(setActiveModalId());
        }
    });
