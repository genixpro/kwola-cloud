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


/**
 * TODO: More of the code in this class should be shared with the NewTestingRun class, since they are both meant to look
 * the same.
 */
class ViewRecurringTestingTriggerConfiguration extends Component {
    state = {

    };

    componentDidMount()
    {
        axios.get(`/recurring_testing_trigger/${this.props.match.params.id}`).then((response) =>
        {
            this.setState({recurringTestingTrigger: response.data.recurringTestingTrigger});
        });
    }


    render() {
        const { result } = this.state;

        if (!this.state.recurringTestingTrigger)
        {
            return <LayoutWrapper />;
        }

        return (
            <LayoutWrapper>
                <FullColumn>
                    <Row>
                        <TwoThirdColumn>
                            <div>
                                <RecurringTestingTriggerOptions
                                    recurringTestingTrigger={this.state.recurringTestingTrigger}
                                    disabled={true}
                                    hideHelp={true}
                                />
                                <br/>
                                <br/>
                                <br/>
                                <SizeOfRun
                                    defaultRunConfiguration={this.state.recurringTestingTrigger.configuration}
                                    disabled={true}
                                    hideHelp={true}
                                />
                                <br/>
                                <br/>
                                <br/>
                                <AutologinCredentials
                                    defaultRunConfiguration={this.state.recurringTestingTrigger.configuration}
                                    disabled={true}
                                    hideHelp={true}
                                />
                                <br/>
                                <br/>
                                <br/>
                                <ActionsConfiguration
                                    defaultRunConfiguration={this.state.recurringTestingTrigger.configuration}
                                    disabled={true}
                                    hideHelp={true}
                                />
                                <br/>
                                <br/>
                                <br/>
                                <PathWhitelistConfiguration
                                    defaultRunConfiguration={this.state.recurringTestingTrigger.configuration}
                                    disabled={true}
                                    hideHelp={true}
                                />
                                <br/>
                                <br/>
                                <br/>
                                <ErrorsConfiguration
                                    defaultRunConfiguration={this.state.recurringTestingTrigger.configuration}
                                    disabled={true}
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

const mapStateToProps = (state) => {return { ...state.ViewRecurringTestingTriggerConfiguration} };
export default connect(mapStateToProps)(ViewRecurringTestingTriggerConfiguration);

