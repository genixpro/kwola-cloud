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
        tab: 0
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
                            <AppBar position="static" color="default">
                                <Tabs
                                    value={this.state.tab}
                                    onChange={(changeEvent, newTab) => this.setState({tab: newTab})}
                                    variant="scrollable"
                                    scrollButtons="on"
                                    indicatorColor="primary"
                                    textColor="primary"
                                >
                                    {/*<Tab label="Recurring Testing" icon={<ScheduleIcon />} />*/}
                                    <Tab label="One-Time Run" icon={<SkipNextIcon />} />
                                </Tabs>
                            </AppBar>
                            {this.state.tab === 0 ?
                                <div>
                                    {/*<Papersheet*/}
                                    {/*    title={``}*/}
                                    {/*    subtitle={``}*/}
                                    {/*>*/}
                                    {/*    <RecurringOptions
                                            defaultRunConfiguration={this.state.testingRun.configuration}
                                             onChange={(data) => this.setState(data)}
                                      />*/}
                                    {/*</Papersheet>*/}
                                    {/*<br/>*/}
                                    {/*<br/>*/}
                                    {/*<br/>*/}
                                    <Papersheet
                                        // title={`Size of Testing Run`}
                                        title={``}
                                        subtitle={``}
                                    >
                                        <SizeOfRun
                                            defaultRunConfiguration={this.state.testingRun.configuration}
                                            onChange={(data) => this.setState(data)}
                                            disabled={true}
                                            hideHelp={true}
                                        />
                                    </Papersheet>
                                    <br/>
                                    <br/>
                                    <br/>
                                    <Papersheet
                                        title={`Credentials`}
                                        subtitle={``}
                                    >
                                        <AutologinCredentials
                                            defaultRunConfiguration={this.state.testingRun.configuration}
                                            onChange={(data) => this.setState(data)}
                                            disabled={true}
                                            hideHelp={true}
                                        />
                                    </Papersheet>
                                    <br/>
                                    <br/>
                                    <br/>
                                    <Papersheet
                                        title={`Actions`}
                                        subtitle={``}
                                    >
                                        <ActionsConfiguration
                                            defaultRunConfiguration={this.state.testingRun.configuration}
                                            onChange={(data) => this.setState(data)}
                                            disabled={true}
                                            hideHelp={true}
                                        />
                                    </Papersheet>
                                    <br/>
                                    <br/>
                                    <br/>
                                    <Papersheet
                                        title={`Path Restriction`}
                                        subtitle={``}
                                    >
                                        <PathWhitelistConfiguration
                                            defaultRunConfiguration={this.state.testingRun.configuration}
                                            onChange={(data) => this.setState(data)} application={this.state.application}
                                            disabled={true}
                                            hideHelp={true}
                                        />
                                    </Papersheet>
                                    <br/>
                                    <br/>
                                    <br/>
                                    <Papersheet
                                        title={`Errors`}
                                        subtitle={``}
                                    >
                                        <ErrorsConfiguration
                                            defaultRunConfiguration={this.state.testingRun.configuration}
                                            onChange={(data) => this.setState(data)}
                                            disabled={true}
                                            hideHelp={true}
                                        />
                                    </Papersheet>
                                </div>
                                : null
                            }
                            {
                                this.state.tab === 1 ?
                                    <div>
                                        <Papersheet
                                            title={`Size of Testing Run`}
                                            subtitle={``}
                                        >
                                            <SizeOfRun
                                                defaultRunConfiguration={this.state.testingRun.configuration}
                                                onChange={(data) => this.setState(data)}
                                                disabled={true}
                                                hideHelp={true}
                                            />
                                        </Papersheet>
                                        <br/>
                                        <br/>
                                        <br/>
                                        <Papersheet
                                            title={`Credentials`}
                                            subtitle={``}
                                        >
                                            <AutologinCredentials
                                                defaultRunConfiguration={this.state.testingRun.configuration}
                                                onChange={(data) => this.setState(data)}
                                                disabled={true}
                                                hideHelp={true}
                                            />
                                        </Papersheet>
                                        <br/>
                                        <br/>
                                        <br/>
                                        <Papersheet
                                            title={`Actions`}
                                            subtitle={``}
                                        >
                                            <ActionsConfiguration
                                                defaultRunConfiguration={this.state.testingRun.configuration}
                                                onChange={(data) => this.setState(data)}
                                                disabled={true}
                                                hideHelp={true}
                                            />
                                        </Papersheet>
                                        <br/>
                                        <br/>
                                        <br/>
                                        <Papersheet
                                            title={`Path Restriction`}
                                            subtitle={``}
                                        >
                                            <PathWhitelistConfiguration
                                                defaultRunConfiguration={this.state.testingRun.configuration}
                                                onChange={(data) => this.setState(data)} application={this.state.application}
                                                disabled={true}
                                                hideHelp={true}
                                            />
                                        </Papersheet>
                                        <br/>
                                        <br/>
                                        <br/>
                                        <Papersheet
                                            title={`Errors`}
                                            subtitle={``}
                                        >
                                            <ErrorsConfiguration
                                                defaultRunConfiguration={this.state.testingRun.configuration}
                                                onChange={(data) => this.setState(data)}
                                                disabled={true}
                                                hideHelp={true}
                                            />
                                        </Papersheet>
                                    </div>
                                    : null
                            }
                        </TwoThirdColumn>
                    </Row>
                </FullColumn>
            </LayoutWrapper>

        );
    }
}

const mapStateToProps = (state) => {return { ...state.ViewTestingRunConfiguration} };
export default connect(mapStateToProps)(ViewTestingRunConfiguration);

