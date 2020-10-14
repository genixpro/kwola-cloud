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


/**
 * TODO: More of the code in this class should be shared with the NewTestingRun class, since they are both meant to look
 * the same.
 */
class ViewTestingRunConfiguration extends Component {
    state = {

    };

    componentDidMount()
    {
        axios.get(`/testing_runs/${this.props.match.params.id}`).then((response) =>
        {
            this.setState({testingRun: response.data.testingRun})
        });
    }


    render() {
        const { result } = this.state;

        if (!this.state.testingRun)
        {
            return <LayoutWrapper />;
        }

        return (
            <LayoutWrapper>
                <FullColumn>
                    <Row>
                        <TwoThirdColumn>
                            <div>
                                <SizeOfRun
                                    defaultRunConfiguration={this.state.testingRun.configuration}
                                    onChange={(data) => this.setState(data)}
                                    disabled={true}
                                    hideHelp={true}
                                />
                                <br/>
                                <br/>
                                <br/>
                                <AutologinCredentials
                                    defaultRunConfiguration={this.state.testingRun.configuration}
                                    onChange={(data) => this.setState(data)}
                                    disabled={true}
                                    hideHelp={true}
                                />
                                <br/>
                                <br/>
                                <br/>
                                <ActionsConfiguration
                                    defaultRunConfiguration={this.state.testingRun.configuration}
                                    onChange={(data) => this.setState(data)}
                                    disabled={true}
                                    hideHelp={true}
                                />
                                <br/>
                                <br/>
                                <br/>
                                <PathWhitelistConfiguration
                                    defaultRunConfiguration={this.state.testingRun.configuration}
                                    onChange={(data) => this.setState(data)} application={this.state.application}
                                    disabled={true}
                                    hideHelp={true}
                                />
                                <br/>
                                <br/>
                                <br/>
                                <ErrorsConfiguration
                                    defaultRunConfiguration={this.state.testingRun.configuration}
                                    onChange={(data) => this.setState(data)}
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

const mapStateToProps = (state) => {return { ...state.ViewTestingRunConfiguration} };
export default connect(mapStateToProps)(ViewTestingRunConfiguration);

