import React, { Component } from 'react';
//import {connect, Provider} from 'react-redux';
import {Table} from "../ListApplications/materialUiTables.style";
import {TableBody, TableCell, TableHead, TableRow, TablePagination} from "../../components/uielements/table";
import moment from 'moment';
import {connect, Provider} from 'react-redux';
import MaterialTable from 'material-table'
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
import {FullColumn, HalfColumn, OneThirdColumn, Column, Row, TwoThirdColumn} from "../../components/utility/rowColumn";


class BugsTable extends Component{
	state = {
        newPage:0,
        setPage:0,
        rowsPerPage:10,
        muted: {},
        importanceLevels: {}
    };

    constructor(props)
    {
        super(props);
        this.mutedErrorIds = {};
    }



	// handleChangePage = (event, newPage) => {
 //            this.setState({newPage:newPage})
 //    };

 //    handleChangeRowsPerPage  = (event, rowsPerPage) => {
 //        this.setState({rowsPerPage:rowsPerPage.props.value})
 //    }

    handleRowClick = (event, rowData)=>{
        this.props.history.push(`/app/dashboard/bugs/${rowData._id}`)
    }

    processData = (data) => {
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


	render()
    {
        const setRowsPerPage = 10;
        const page = this.state.newPage
        let setPage = this.state.setPage
        const rowsPerPage = this.state.rowsPerPage
        const tableData = this.processData(this.props.data)

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

        return(
	 		<div>
                <div className={"bug-filter-controls"}>
                    <div className={"bug-filter-controls-label-wrapper"}>
                        <span className={"bug-filter-controls-label"}>Filters: </span>
                    </div>
                    <div className={"bug-filter-controls-inputs-wrapper"}>
                        {statusFilter}
                        {bugTypeForm}
                        {importanceFilter}
                        {browserFilter}
                        {windowSizeFilter}
                        {httpErrorStatusCodeFilter}
                        {messageFilter}
                    </div>
                </div>
                <MaterialTable
                  columns={[
                    {
                        title: 'id',
                        field: '_id',
                        hidden: true,
                        grouping: false
                    },
                    {
                        title: 'Bug Screenshot',
                        field: "image",
                        width:'15%',
                        render: (rowData) => {
                            return <div className={"bugs-table-bug-screenshot-wrapper"}>
                                {rowData.isBugNew ? <div className="new-bug-ribbon"><span>NEW</span></div> : null}
                                <img className={"bugs-table-bug-screenshot"} alt={"Bug Screenshot"} src={`${process.env.REACT_APP_BACKEND_API_URL}bugs/${rowData._id}/error_frame?token=${Auth.getQueryParameterToken()}`} />
                            </div>
                        },
                        cellStyle: {
                            width:'15%'
                        },
                        grouping: false
                    },
                    {
                        title: 'Type',
                        field: '_cls',
                        width:'10%',
                        grouping: true,
                        cellStyle: {
                          width:'10%'
                        }
                     },
                    {
                        title: 'Message', field: 'message',
                        width: "50%",
                        grouping: false,
                        cellStyle: {
                          width: "50%",
                          maxWidth: "500px",
                          overflow: "hidden"
                        },
                        render: (rowData) => <div style={{"maxHeight": "90px", "overflow": "hidden"}}><span style={{"whiteSpace": 'pre-wrap'}}>{rowData.message.trim()}</span></div>
                     },
                      {
                          title: 'Importance', field: 'importanceLevel',
                          width: "15%",
                          grouping: false,
                          cellStyle: {
                              width: "15%"
                          },
                          render: (rowData) => <select value={this.state.importanceLevels[rowData._id] || rowData.importanceLevel}
                                                                onClick={(evt) => evt.stopPropagation()}
                                                                onChange={(evt) => this.changeBugImportanceLevel(rowData, evt.target.value)}
                                                        >
                              <option value={1}>1 (highest)</option>
                              <option value={2}>2</option>
                              <option value={3}>3</option>
                              <option value={4}>4</option>
                              <option value={5}>5 (lowest)</option>
                          </select>

                      },
                  {
                      // field: 'options',
                      title: 'Options',
                      grouping: false,
                      render: (rowData) => <Button variant="contained"
                                                            size="small"
                                                            color={!this.state.muted[rowData._id] ? "default" : "primary"}
                                                            title={!this.state.muted[rowData._id] ? "Mute this error" : "Unmute this error"}
                                                            onClick={(evt) => this.toggleMuteError(evt, rowData)}>
                          <VolumeOffIcon />
                      </Button>,
                      width:'10%',
                      cellStyle: {
                          width: '10%'
                      }
                  },
                  {
                      title: 'Page',
                      field: 'canonicalPageUrl',
                      hidden:true,
                      defaultGroupOrder: 0,
                      grouping: false,
                  },
                  ]}
                  data={tableData}
                  title=""
                  onRowClick={this.handleRowClick}
                  components={
                      {
                          Groupbar: () => null,
                          Toolbar: () => null
                      }
                  }
                  options={{
                    grouping: true,
                    search: false,
                    pageSize:10,
                    pageSizeOptions:[5,10,20,50],
                    rowStyle: {
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "normal",wordWrap: "break-word",
                      fontSize:"14px"
                    }
                  }}
                />
            </div>
	    )
	}
}
const mapStateToProps = (state) => {return { ...state.BugsTable} };
export default connect(mapStateToProps)(BugsTable);