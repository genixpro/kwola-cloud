import React, { Component } from 'react';
//import {connect, Provider} from 'react-redux';
import {Table} from "../ListApplications/materialUiTables.style";
import {TableBody, TableCell, TableHead, TableRow, TablePagination} from "../../components/uielements/table";
import moment from 'moment';
import {connect, Provider} from 'react-redux';
import Icon from "../../components/uielements/icon";
import Button from "../../components/uielements/button";
import VolumeOffIcon from '@material-ui/icons/VolumeOff';
import axios from "axios";
import Promise from "bluebird";
import Auth from "../../helpers/auth0";
import "./bugsTable.scss"
import Select from '@material-ui/core/Select';
import { FormControl } from '../../components/uielements/form';
import Input, { InputLabel } from '../../components/uielements/input';
import { MenuItem } from '../../components/uielements/menus';
import _ from "underscore";
import ExpansionPanel, {
    ExpansionPanelSummary,
    ExpansionPanelDetails,
} from '../../components/uielements/expansionPanel';
import Typography from '../../components/uielements/typography';

import {FullColumn, HalfColumn, OneThirdColumn, Column, Row, TwoThirdColumn} from "../../components/utility/rowColumn";
import Papersheet from "../../components/utility/papersheet/papersheet.style";


class BugsTable extends Component
{
	state = {
        muted: {},
        importanceLevels: {},
        bugStatuses: {},
        openedBugList: null
    };

    constructor(props)
    {
        super(props);
        this.mutedErrorIds = {};
    }

    handleRowClick(event, rowData)
    {
        this.props.history.push(`/app/dashboard/bugs/${rowData._id}`)
    }


    filterBugs(data)
    {
        let rdata = []
        if(data)
        {
            data.forEach((bug) =>
            {
                if (this.state.bugTypeFilter && bug.error._cls !== this.state.bugTypeFilter)
                {
                    return;
                }
                if (this.state.importanceFilter && bug.importanceLevel !== this.state.importanceFilter)
                {
                    return;
                }
                if (this.state.browserFilter && bug.browser !== this.state.browserFilter)
                {
                    return;
                }
                if (this.state.windowSizeFilter && bug.windowSize !== this.state.windowSizeFilter)
                {
                    return;
                }
                if (this.state.httpErrorCodeFilter && bug.error.statusCode !== this.state.httpErrorCodeFilter)
                {
                    return;
                }
                if (this.state.messageFilter && bug.error.message.toLowerCase().indexOf(this.state.messageFilter.toLowerCase()) === -1)
                {
                    return;
                }
                if (this.state.statusFilter && bug.status !== this.state.statusFilter)
                {
                    return;
                }

                bug._cls = bug.error._cls;
                bug.message = bug.error.message;
                rdata.push(bug)
            })
        }
        return rdata;
    }

    toggleMuteError(evt, bug)
    {
        evt.stopPropagation();

        const muted = this.state.muted;
        if (!muted[bug._id] && !this.mutedErrorIds[bug._id])
        {
            const mutedErrorData = {
                applicationId: this.props.match.params.id,
                error: bug.error,
                creationDate: new Date().toISOString(),
                totalOccurrences: 1
            };

            if (bug.creationDate)
            {
                mutedErrorData.mostRecentOccurrence = new Date(bug.creationDate.$date).toISOString()
            }
            else
            {
                mutedErrorData.mostRecentOccurrence = new Date().toISOString();
            }

            axios.post(`/muted_errors`, mutedErrorData).then((response) => {
                const mutedErrorId = response.data.mutedErrorId;

                this.mutedErrorIds[bug._id] = mutedErrorId;

                axios.post(`/bugs/${bug._id}`, {isMuted: true, mutedErrorId: mutedErrorId}).then((response) => {

                }, (error) =>
                {
                    console.error("Error occurred while muting bug!");
                });

            }, (error) =>
            {
                console.error("Error occurred while muting bug!");
            });

            muted[bug._id] = true;
        }
        else if(muted[bug._id] && this.mutedErrorIds[bug._id])
        {
            axios.delete(`/muted_errors/${this.mutedErrorIds[bug._id]}`).then((response) => {
                this.mutedErrorIds[bug._id] = null;

                axios.post(`/bugs/${bug._id}`, {isMuted: false, mutedErrorId: null}).then((response) => {

                }, (error) =>
                {
                    console.error("Error occurred while muting bug!");
                });
            }, (error) =>
            {
                console.error("Error occurred while muting bug!");
            });

            muted[bug._id] = false;
        }
        this.setState({muted});
    }

    changeBugImportanceLevel(bug, newImportanceLevel)
    {
        const importanceLevels = this.state.importanceLevels;
        importanceLevels[bug._id] = newImportanceLevel;
        this.setState({importanceLevels});

        axios.post(`/bugs/${bug._id}`, {importanceLevel: newImportanceLevel}).then((response) => {

        }, (error) =>
        {
            console.error("Error occurred while muting bug!");
        });
    }

    changeBugStatus(bug, newStatus)
    {
        const bugStatuses = this.state.bugStatuses;
        bugStatuses[bug._id] = newStatus;
        this.setState({bugStatuses});

        axios.post(`/bugs/${bug._id}`, {status: newStatus}).then((response) => {

        }, (error) =>
        {
            console.error("Error occurred while updating bug status.");
        });
    }

    onBugTypeFilterChanged(newValue)
    {
        this.setState({bugTypeFilter: newValue});
    }

    onImportanceFilterChanged(newValue)
    {
        this.setState({importanceFilter: newValue});
    }

    onBrowserFilterChanged(newValue)
    {
        this.setState({browserFilter: newValue});
    }

    onWindowSizeFilterChanged(newValue)
    {
        this.setState({windowSizeFilter: newValue});
    }

    onStatusFilterChanged(newValue)
    {
        this.setState({statusFilter: newValue});
    }

    onHttpErrorCodeFilterChanged(newValue)
    {
        this.setState({httpErrorCodeFilter: newValue});
    }

    onMessageFilterChanged(newValue)
    {
        this.setState({messageFilter: newValue});
    }

    onPageFilterChanged(newValue)
    {
        this.setState({pageFilter: newValue});
    }


    openBugList(canonicalUrl)
    {
        if (this.state.openedBugList === canonicalUrl)
        {
            this.setState({openedBugList: null});
        }
        else
        {
            this.setState({openedBugList: canonicalUrl})
        }
    }

	render()
    {
        const tableData = this.filterBugs(this.props.data)
        const groupedBugs = _.groupBy(tableData, (bug) => bug.canonicalPageUrl)

        const bugTypeForm = <FormControl className={"bug-filter"}>
            <InputLabel htmlFor="bug-type-filter">Bug Type&nbsp;&nbsp;</InputLabel>
            <Select
                value={this.state.bugTypeFilter}
                onChange={(evt) => this.onBugTypeFilterChanged(evt.target.value)}
                input={<Input id="bug-type-filter" />}
            >
                <MenuItem value=""><em>None</em></MenuItem>
                <MenuItem value="ExceptionError">ExceptionError</MenuItem>
                <MenuItem value="LogError">LogError</MenuItem>
                <MenuItem value="HttpError">HttpError</MenuItem>
                <MenuItem value="DotNetRPCError">RPC Error</MenuItem>
            </Select>
        </FormControl>;

        const importanceFilter = <FormControl className={"bug-filter"}>
            <InputLabel htmlFor="importance-filter">Importance&nbsp;&nbsp;</InputLabel>
            <Select
                value={this.state.importanceFilter}
                onChange={(evt) => this.onImportanceFilterChanged(evt.target.value)}
                input={<Input id="importance-filter" />}
            >
                <MenuItem value=""><em>None</em></MenuItem>
                <MenuItem value={1}>1 (highest)</MenuItem>
                <MenuItem value={2}>2</MenuItem>
                <MenuItem value={3}>3</MenuItem>
                <MenuItem value={4}>4</MenuItem>
                <MenuItem value={5}>5 (lowest) </MenuItem>
            </Select>
        </FormControl>;

        const browserFilter = <FormControl className={"bug-filter"}>
            <InputLabel htmlFor="browser-filter">Browser&nbsp;&nbsp;</InputLabel>
            <Select
                value={this.state.browserFilter}
                onChange={(evt) => this.onBrowserFilterChanged(evt.target.value)}
                input={<Input id="browser-filter" />}
            >
                <MenuItem value=""><em>None</em></MenuItem>
                <MenuItem value="chrome">Chrome</MenuItem>
                <MenuItem value="firefox">Firefox</MenuItem>
                <MenuItem value="edge">Edge</MenuItem>
            </Select>
        </FormControl>;

        const windowSizeFilter = <FormControl className={"bug-filter"}>
            <InputLabel htmlFor="window-size-filter">Window Size&nbsp;&nbsp;</InputLabel>
            <Select
                value={this.state.windowSizeFilter}
                onChange={(evt) => this.onWindowSizeFilterChanged(evt.target.value)}
                input={<Input id="window-size-filter" />}
            >
                <MenuItem value=""><em>None</em></MenuItem>
                <MenuItem value="desktop">Desktop</MenuItem>
                <MenuItem value="tablet">Tablet</MenuItem>
                <MenuItem value="mobile">Mobile</MenuItem>
            </Select>
        </FormControl>;

        const statusFilter = <FormControl className={"bug-filter"}>
            <InputLabel htmlFor="status-filter">Status&nbsp;&nbsp;</InputLabel>
            <Select
                value={this.state.statusFilter}
                onChange={(evt) => this.onStatusFilterChanged(evt.target.value)}
                input={<Input id="status-filter" />}
            >
                <MenuItem value=""><em>None</em></MenuItem>
                <MenuItem value="new">New</MenuItem>
                <MenuItem value="triage">Triage</MenuItem>
                <MenuItem value="fix_in_progress">Fix In Progress</MenuItem>
                <MenuItem value="needs_testing">Needs Testing</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
            </Select>
        </FormControl>;

        const httpErrorStatusCodeFilter = <FormControl className={"bug-filter"}>
            <InputLabel htmlFor="status-filter">HTTP Error Code&nbsp;&nbsp;</InputLabel>
            <Select
                value={this.state.httpErrorCodeFilter}
                onChange={(evt) => this.onHttpErrorCodeFilterChanged(evt.target.value)}
                input={<Input id="status-filter" />}
            >
                <MenuItem value=""><em>None</em></MenuItem>
                <MenuItem value={400}>400</MenuItem>
                <MenuItem value={401}>401</MenuItem>
                <MenuItem value={403}>403</MenuItem>
                <MenuItem value={404}>404</MenuItem>
                <MenuItem value={500}>500</MenuItem>
                <MenuItem value={501}>501</MenuItem>
                <MenuItem value={502}>502</MenuItem>
                <MenuItem value={503}>503</MenuItem>
                <MenuItem value={504}>504</MenuItem>
            </Select>
        </FormControl>;

        const messageFilter = <FormControl className={"bug-message-filter"}>
            <InputLabel htmlFor="message-filter">Message&nbsp;&nbsp;</InputLabel>
            <Input
                value={this.state.messageFilter}
                onChange={(evt) => this.onMessageFilterChanged(evt.target.value)}
                input={<Input id="message-filter" />}
            />
        </FormControl>;

        const pageFilter = <FormControl className={"bug-page-filter"}>
            <InputLabel htmlFor="page-filter">Page&nbsp;&nbsp;</InputLabel>
            <Input
                value={this.state.pageFilter}
                onChange={(evt) => this.onPageFilterChanged(evt.target.value)}
                input={<Input id="page-filter" />}
            />
        </FormControl>;

        return(
	 		<div>
                <div className={"bug-filter-controls"}>
                    <div className={"bug-filter-controls-label-wrapper"}>
                        <span className={"bug-filter-controls-label"}>Filters: </span>
                    </div>
                    <div className={"bug-filter-controls-inputs-wrapper"}>
                        {messageFilter}
                        {pageFilter}
                        {statusFilter}
                        {bugTypeForm}
                        {importanceFilter}
                        {browserFilter}
                        {windowSizeFilter}
                        {httpErrorStatusCodeFilter}
                    </div>
                </div>
                <div className={"groups-list"}>
                    {
                        _.sortBy(Object.keys(groupedBugs), (v) => v).map((group) =>
                        {
                            return <ExpansionPanel
                                key={group}
                                expanded={this.state.openedBugList === group}
                                onChange={() => this.openBugList(group)}
                            >
                                <ExpansionPanelSummary expandIcon={<Icon>expand_more</Icon>}>
                                    <span><strong>Page: </strong> {group}</span>
                                </ExpansionPanelSummary>
                                <ExpansionPanelDetails>
                                    <div className={"bugs-list"}>
                                        {
                                            groupedBugs[group].map((bug) =>
                                            {
                                                return <div key={bug._id} className={"bug-row"} onClick={(evt) => this.handleRowClick(evt, bug)}>
                                                             <div className={"bugs-table-bug-screenshot-wrapper"}>
                                                                 {bug.isBugNew ? <div className="new-bug-ribbon"><span>NEW</span></div> : null}
                                                                 <img className={"bugs-table-bug-screenshot"} alt={"Bug Screenshot"} src={`${process.env.REACT_APP_BACKEND_API_URL}bugs/${bug._id}/error_frame?token=${Auth.getQueryParameterToken()}`} />
                                                             </div>

                                                            <div className={"bugs-table-basic-details"}>
                                                                <span className={"bug-detail-label"}>Type:</span>
                                                                <span className={"bug-detail-value"}>{bug.error._cls}</span>
                                                                {
                                                                    bug.error._cls === "HttpError" ?
                                                                        <span className={"bug-detail-label"}>HTTP Status:</span>
                                                                        : null
                                                                }
                                                                {
                                                                    bug.error._cls === "HttpError" ?
                                                                        <span className={"bug-detail-value"}>{bug.error.statusCode}</span>
                                                                        : null
                                                                }
                                                                <span className={"bug-detail-label"}>Importance:</span>
                                                                <div>
                                                                    <select value={this.state.importanceLevels[bug._id] || bug.importanceLevel}
                                                                            onClick={(evt) => evt.stopPropagation()}
                                                                            onChange={(evt) => this.changeBugImportanceLevel(bug, evt.target.value)}
                                                                    >
                                                                        <option value={1}>1 (highest)</option>
                                                                        <option value={2}>2</option>
                                                                        <option value={3}>3</option>
                                                                        <option value={4}>4</option>
                                                                        <option value={5}>5 (lowest)</option>
                                                                    </select>
                                                                </div>
                                                                <span className={"bug-detail-label"}>Status:</span>
                                                                <div>
                                                                    <select value={this.state.bugStatuses[bug._id] || bug.status}
                                                                            onClick={(evt) => evt.stopPropagation()}
                                                                            onChange={(evt) => this.changeBugStatus(bug, evt.target.value)}>
                                                                        <option value={'new'}>New</option>
                                                                        <option value={'triage'}>In triage</option>
                                                                        <option value={'fix_in_progress'}>Fix in progress</option>
                                                                        <option value={'needs_testing'}>Fixed, needs testing</option>
                                                                        <option value={'closed'}>Closed</option>
                                                                    </select>
                                                                </div>
                                                                <span className={"bug-detail-label"}>Browser:</span>
                                                                <span className={"bug-detail-value"}>{bug.browser}</span>
                                                                <span className={"bug-detail-label"}>Window Size:</span>
                                                                <span className={"bug-detail-value"}>{bug.windowSize}</span>
                                                            </div>
                                                            <div className={"bugs-table-message"}>
                                                                {
                                                                    bug.error._cls === "HttpError" ?
                                                                        <span className={"bug-message-label"}>URL:<br/></span>
                                                                        : null
                                                                }
                                                                {
                                                                    bug.error._cls === "HttpError" ?
                                                                        <span className={"bug-message-value"}>{bug.error.url}<br/><br/></span>
                                                                        : null
                                                                }
                                                                <span className={"bug-message-label"}>Message:</span>
                                                                <br/>
                                                                <div className={"bug-message-value"}>{bug.error.message}</div>
                                                            </div>


                                                            <div className={"bugs-table-controls"}>
                                                                <Button variant="contained"
                                                                        size="small"
                                                                        color={!this.state.muted[bug._id] ? "default" : "primary"}
                                                                        title={!this.state.muted[bug._id] ? "Mute this error" : "Unmute this error"}
                                                                        onClick={(evt) => this.toggleMuteError(evt, bug)}>
                                                                    <VolumeOffIcon />
                                                                </Button>
                                                            </div>
                                                         </div>;
                                            })
                                        }
                                    </div>
                                </ExpansionPanelDetails>
                            </ExpansionPanel>
                        })
                    }
                    {
                        Object.keys(groupedBugs).length === 0 ?
                            <Papersheet className={"no-bugs-found-message-container"}>
                                There were no bugs found matching the filters you have provided.
                            </Papersheet> : null
                    }

                </div>
            </div>
	    )
	}
}
const mapStateToProps = (state) => {return { ...state.BugsTable} };
export default connect(mapStateToProps)(BugsTable);
