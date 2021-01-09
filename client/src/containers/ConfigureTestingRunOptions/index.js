import AppBar from '../../components/uielements/appbar';
import LayoutWrapper from '../../components/utility/layoutWrapper';
import Papersheet, { DemoWrapper } from '../../components/utility/papersheet';
import React, { Component } from 'react';
import SkipNextIcon from '@material-ui/icons/SkipNext';
import Tabs, { Tab } from '../../components/uielements/tabs';
import axios from "axios";
import { FullColumn , HalfColumn, OneThirdColumn, TwoThirdColumn, OneFourthColumn, Row, Column} from '../../components/utility/rowColumn';
import {connect, Provider} from 'react-redux';
import ActionsConfiguration from "../NewTestingRun/ActionsConfiguration";
import AutologinCredentials from "../NewTestingRun/AutologinCredentials";
import ErrorsConfiguration from "../NewTestingRun/ErrorsConfiguration";
import PathWhitelistConfiguration from "../NewTestingRun/PathWhitelistConfiguration";
import SizeOfRun from "../NewTestingRun/SizeOfRun";
import RecurringTestingTriggerOptions from "../NewRecurringTestingTrigger/RecurringTestingTriggerOptions";
import _ from "underscore";


/**
 * TODO: More of the code in this class should be shared with the NewTestingRun class, since they are both meant to look
 * the same.
 */
class ConfigureTestingRunOptions extends Component {
    state = {
        application: null
    };

    componentDidMount()
    {
        axios.get(`/application/${this.getApplicationId()}`).then((response) =>
        {
            this.setState({application: response.data});

            if (!response.data.defaultRunConfiguration)
            {
                console.error(`Application object is missing defaultRunConfiguration. Object JSON: ${JSON.stringify(response.data)}`)
            }
        });
    }

    changeRunConfiguration(newValues)
    {
        const application = this.state.application;
        if (!application.defaultRunConfiguration)
        {
            console.error(`Application object is missing defaultRunConfiguration. Object JSON: ${JSON.stringify(application)}`)
            return;
        }

        Object.keys(newValues).forEach((key) =>
        {
            application.defaultRunConfiguration[key] = newValues[key];
        });
        this.setState({application: application}, () => this.saveApplication())
    }

    saveApplication = _.debounce(() =>
    {
        axios.post(`/application/${this.getApplicationId()}`, this.state.application).then((response) =>
        {
            // this.setState({application: response.data.application})
        });
    }, 500)


    getApplicationId()
    {
        return this.props.match.params.id;
    }


    render() {
        const { result } = this.state;

        if (!this.state.application)
        {
            return <LayoutWrapper />;
        }

        return (
            <LayoutWrapper>
                <FullColumn>
                    <Row>
                        <TwoThirdColumn>
                            <div>
                                <AutologinCredentials
                                    defaultRunConfiguration={this.state.application.defaultRunConfiguration}
                                    onChange={(data) => this.changeRunConfiguration(data)}
                                    disabled={false}
                                    hideHelp={true}
                                />
                                <br/>
                                <br/>
                                <br/>
                                <ActionsConfiguration
                                    defaultRunConfiguration={this.state.application.defaultRunConfiguration}
                                    onChange={(data) => this.changeRunConfiguration(data)}
                                    disabled={false}
                                    hideHelp={true}
                                />
                                <br/>
                                <br/>
                                <br/>
                                <PathWhitelistConfiguration
                                    defaultRunConfiguration={this.state.application.defaultRunConfiguration}
                                    onChange={(data) => this.changeRunConfiguration(data)}
                                    disabled={false}
                                    hideHelp={true}
                                />
                                <br/>
                                <br/>
                                <br/>
                                <ErrorsConfiguration
                                    defaultRunConfiguration={this.state.application.defaultRunConfiguration}
                                    onChange={(data) => this.changeRunConfiguration(data)}
                                    disabled={false}
                                    hideHelp={true}
                                />
                            </div>
                        </TwoThirdColumn>
                    </Row>
                </FullColumn>
            </LayoutWrapper>

        );
    }
}

const mapStateToProps = (state) => {return { ...state.ConfigureTestingRunOptions} };
export default connect(mapStateToProps)(ConfigureTestingRunOptions);

