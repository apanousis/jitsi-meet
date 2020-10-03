// @flow

import React, { PureComponent } from 'react';
import { Text, View } from 'react-native';

import { ColorSchemeRegistry } from '../../../base/color-scheme';
import { getFeatureFlag, INVITE_ENABLED } from '../../../base/flags';
import { translate } from '../../../base/i18n';
import { getParticipantCount } from '../../../base/participants';
import { connect } from '../../../base/redux';
import { StyleType } from '../../../base/styles';

import styles from './styles';

/**
 * Props type of the component.
 */
type Props = {

    /**
     * True if the invite functions (dial out, invite, share...etc) are disabled.
     */
    _isInviteFunctionsDiabled: boolean,

    /**
     * True if it's a lonely meeting (participant count excluding fakes is 1).
     */
    _isLonelyMeeting: boolean,

    /**
     * Color schemed styles of the component.
     */
    _styles: StyleType,

    /**
     * The Redux Dispatch function.
     */
    dispatch: Function,

    /**
     * Function to be used to translate i18n labels.
     */
    t: Function
};

/**
 * Implements the UI elements to be displayed in the lonely meeting experience.
 */
class LonelyMeetingExperience extends PureComponent<Props> {

    /**
     * Implements {@code PureComponent#render}.
     *
     * @inheritdoc
     */
    render() {
        const { _isLonelyMeeting, _styles, t } = this.props;

        if (!_isLonelyMeeting) {
            return null;
        }

        return (
            <View style = { styles.lonelyMeetingContainer }>
                <Text
                    style = { [
                        styles.lonelyMessage,
                        _styles.lonelyMessage
                    ] }>
                    { t('lonelyMeetingExperience.youAreAlone') }
                </Text>
            </View>
        );
    }
}

/**
 * Maps parts of the Redux state to the props of this Component.
 *
 * @param {Object} state - The redux state.
 * @private
 * @returns {Props}
 */
function _mapStateToProps(state): $Shape<Props> {
    const { disableInviteFunctions } = state['features/base/config'];
    const { conference } = state['features/base/conference'];
    const flag = getFeatureFlag(state, INVITE_ENABLED, true);

    return {
        _isInviteFunctionsDiabled: !flag || disableInviteFunctions,
        _isLonelyMeeting: conference && getParticipantCount(state) === 1,
        _styles: ColorSchemeRegistry.get(state, 'Conference')
    };
}

export default connect(_mapStateToProps)(translate(LonelyMeetingExperience));
