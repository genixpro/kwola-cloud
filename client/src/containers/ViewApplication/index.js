import React, { Component } from 'react';
import {connect, Provider} from 'react-redux';
import { createStore, combineReducers } from 'redux';
import { reducer as reduxFormReducer } from 'redux-form';
import { Link } from 'react-router-dom';
import LayoutWrapper from '../../components/utility/layoutWrapper';
import PageTitle from '../../components/utility/paperTitle';
import Papersheet, { DemoWrapper } from '../../components/utility/papersheet';
import { FullColumn , HalfColumn, OneThirdColumn, TwoThirdColumn, Row, Column} from '../../components/utility/rowColumn';
import {withStyles} from "@material-ui/core";
import {store} from "../../redux/store";
import SingleCard from '../Shuffle/singleCard.js';
import BoxCard from '../../components/boxCard';
import Img7 from '../../images/7.jpg';
import user from '../../images/user.jpg';
import ActionButton from "../../components/mail/singleMail/actionButton";
import {Button} from "../UiElements/Button/button.style";
import Icon from "../../components/uielements/icon";
import moment from 'moment';
import {Chip, Wrapper} from "../UiElements/Chips/chips.style";
import Avatar from "../../components/uielements/avatars";
import {Table} from "../ListApplications/materialUiTables.style";
import {TableBody, TableCell, TableHead, TableRow} from "../../components/uielements/table";
import axios from "axios";
import Auth from "../../helpers/auth0/index"
import mixpanel from 'mixpanel-browser';
import Tooltip from "../../components/uielements/tooltip";
import Title from "../../components/utility/paperTitle";
import SettingsIcon from '@material-ui/icons/Settings';
import Menus, { MenuItem } from '../../components/uielements/menus';
import ScheduleIcon from "@material-ui/icons/Schedule";
import TestingRunsTable from "../ViewRecurringTestingTrigger/testingRunsTable";

class ViewApplication extends Component {
    state = {
        result: '',
        applicationSettingsMenuOpen: false,
        applicationSettingsMenuAnchorElement: null
    };

    componentDidMount()
    {
        axios.get(`/application/${this.props.match.params.id}`).then((response) =>
        {
            this.setState({application: response.data})
        });


        axios.get(`/testing_runs`, {params: {applicationId: this.props.match.params.id}}).then((response) =>
        {
            this.setState({testingRuns: response.data.testingRuns})
        });
    }

    launchTestingSequenceButtonClicked()
    {
        if (process.env.REACT_APP_ENABLE_ANALYTICS === 'true')
        {
            var _hsq = window._hsq = window._hsq || [];
            mixpanel.track("clicked-new-testing-run");
            _hsq.push(["trackEvent", {id: "Clicked New Testing Run"}]);
            window.ga('send', 'event', "new-testing-run", "click");
        }

        this.props.history.push(`/app/dashboard/applications/${this.props.match.params.id}/new_testing_run`);
    }


    setupRecurringTesting()
    {
        axios.get(`/recurring_testing_trigger`, {params: {applicationId: this.props.match.params.id}}).then((response) =>
        {
            if (response.data.recurringTestingTriggers.length > 0)
            {
                this.props.history.push(`/app/dashboard/applications/${this.props.match.params.id}/triggers`);
            }
            else
            {
                this.props.history.push(`/app/dashboard/applications/${this.props.match.params.id}/new_trigger`);
            }
        });

    }

    toggleApplicationSettingsMenuOpen(event)
    {
        this.setState({
            applicationSettingsMenuOpen: !this.state.applicationSettingsMenuOpen,
            applicationSettingsMenuAnchorElement: event.currentTarget
        });
    }

    closeApplicationSettingsMenuOpen()
    {
        this.setState({applicationSettingsMenuOpen: false});
    }


    render() {
        const { result } = this.state;
        const recentRunTooltip = <Tooltip placement="right-end" title="Your Kwola Applications. Click an application to view more.">
                 <Icon color="primary" className="fontSizeSmall">help</Icon>
                </Tooltip> 
        return (
                this.state.application ?
                    <LayoutWrapper>
                        <FullColumn>
                            <Row>
                                <HalfColumn>
                                    <SingleCard src={`${process.env.REACT_APP_BACKEND_API_URL}application/${this.state.application._id}/image?token=${Auth.getQueryParameterToken()}`} grid/>
                                </HalfColumn>
                                <HalfColumn>
                                    <Papersheet
                                        title={`${this.state.application.name}`}
                                        subtitle={`Last Tested ${moment(this.props.timestamp).format('MMM Do, YYYY')}`}
                                        button={
                                            <div>
                                                <Button variant="contained"
                                                                size="small"
                                                                color={"default"}
                                                                title={"Settings"}
                                                                aria-owns={this.state.applicationSettingsMenuOpen ? 'application-settings-menu' : null}
                                                                aria-haspopup="true"
                                                                onClick={(event) => this.toggleApplicationSettingsMenuOpen(event)}
                                                                >
                                                    <SettingsIcon />
                                                </Button>
                                                <Menus
                                                    id="application-settings-menu"
                                                    anchorEl={this.state.applicationSettingsMenuAnchorElement}
                                                    open={this.state.applicationSettingsMenuOpen}
                                                    onClose={() => this.closeApplicationSettingsMenuOpen()}
                                                >
                                                    <MenuItem><Link to={`/app/dashboard/applications/${this.props.match.params.id}/muted_errors`} style={{"color":"black", "textDecoration": "none"}}>View Muted Errors</Link></MenuItem>
                                                    <MenuItem><Link to={`/app/dashboard/applications/${this.props.match.params.id}/notifications`} style={{"color":"black", "textDecoration": "none"}}>Configure Notifications</Link></MenuItem>
                                                    <MenuItem><Link to={`/app/dashboard/applications/${this.props.match.params.id}/integrations`} style={{"color":"black", "textDecoration": "none"}}>Configure Integrations</Link></MenuItem>
                                                    <MenuItem><Link to={`/app/dashboard/applications/${this.props.match.params.id}/triggers`} style={{"color":"black", "textDecoration": "none"}}>View Recurring Testing Triggers</Link></MenuItem>
                                                </Menus>

                                            </div>
                                        }
                                    >
                                        <div>
                                            URL:&nbsp;&nbsp;<a href={this.state.application.url}>{this.state.application.url}</a>
                                            <br/>
                                            <br/>
                                            <br/>
                                        </div>
                                        <DemoWrapper>
                                            <Button variant="extended" color="primary" onClick={() => this.setupRecurringTesting()}>
                                                Setup Recurring Testing
                                                <ScheduleIcon style={{"marginLeft": "10px"}} />
                                            </Button>
                                            <Button variant="extended" color="primary" onClick={() => this.launchTestingSequenceButtonClicked()}>
                                                Launch New Testing Run
                                                <Icon className="rightIcon" style={{"marginLeft": "10px"}}>send</Icon>
                                            </Button>
                                        </DemoWrapper>
                                    </Papersheet>
                                </HalfColumn>
                            </Row>


                            <Row>
                                <FullColumn>
                                    <Papersheet title={"Recent Testing Runs"} tooltip={recentRunTooltip}>
                                        <TestingRunsTable data={this.state.testingRuns} history={this.props.history} />
                                    </Papersheet>
                                </FullColumn>
                            </Row>
                        </FullColumn>
                    </LayoutWrapper>
                    : null

        );
    }
}

const mapStateToProps = (state) => {return { ...state.ViewApplication} };
export default connect(mapStateToProps)(ViewApplication);

