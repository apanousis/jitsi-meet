/* @flow */

import React, { Component } from 'react';

import { createDeepLinkingPageEvent, sendAnalytics } from '../../analytics';

declare var interfaceConfig: Object;

/**
 * React component representing no mobile app page.
 *
 * @class NoMobileApp
 */
export default class NoMobileApp extends Component<*> {
    /**
     * Implements the Component's componentDidMount method.
     *
     * @inheritdoc
     */
    componentDidMount() {
        sendAnalytics(
            createDeepLinkingPageEvent(
                'displayed', 'noMobileApp', { isMobileBrowser: true }));
    }

    /**
     * Renders the component.
     *
     * @returns {ReactElement}
     */
    render() {
        const ns = 'no-mobile-app';

        return (
            <div className = { ns }>
                <p className = { `${ns}__description` }>
                    Download the Kinesis Training mobile app <a href = { 'https://kinesis-training.com' }>here</a> to join the training rooms.
                </p>
            </div>
        );
    }
}
