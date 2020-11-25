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

class BugsTable extends Component{
	state = {
        newPage:0,
        setPage:0,
        rowsPerPage:10,
        muted: {}
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
            data.map(bug=>{
                bug._cls = bug.error._cls;
                bug.message = bug.error.message;
                rdata.push(bug)
            })
        }
        return rdata;
    }

    toggleMuteError(evt, bug)
    {
        const muted = this.state.muted;
        if (!muted[bug._id] && !this.mutedErrorIds[bug._id])
        {
            const mutedErrorData = {
                applicationId: this.props.match.params.id,
                error: bug.error,
                creationDate: new Date().toISOString(),
                totalOccurrences: 1,
                mostRecentOccurrence: new Date(bug.creationDate.$date).toISOString()
            };

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
        evt.stopPropagation();
    }

	render(){
        const setRowsPerPage = 10;
        const page = this.state.newPage
        let setPage = this.state.setPage
        const rowsPerPage = this.state.rowsPerPage
        const tableData = this.processData(this.props.data)

	 	return(
	 		<div>
                {/*<Table>style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "normal",wordWrap: "break-word"}}
                    <TableHead>
                        <TableRow>
                            <TableCell>Message</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(this.props.data ? this.props.data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage) : []).map(bug => {
                            return (
                                
                                <TableRow key={bug._id} hover={true} onClick={() => this.props.history.push(`/app/dashboard/bugs/${bug._id}`)} >
                                    <TableCell>{bug.error.message}</TableCell>
                                </TableRow>
                                
                            );
                        })}
                    </TableBody>

                </Table>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25]}
                  component="div"
                  count={this.props.data ? this.props.data.length : 0}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onChangePage={this.handleChangePage}
                  onChangeRowsPerPage={this.handleChangeRowsPerPage}
                />
                */}
                <MaterialTable
                  columns={[ 
                    { title: 'id', field: '_id', hidden:true },
                    {
                        title: 'Bug Screenshot',
                        field: 'image',
                        width:'15%',
                        render: (rowData) => <img className={"bugs-table-bug-screenshot"} alt={"Bug Screenshot"} src={`${process.env.REACT_APP_BACKEND_API_URL}bugs/${rowData._id}/error_frame?token=${Auth.getQueryParameterToken()}`} />,
                        cellStyle: {
                            width:'15%'
                        }
                    },
                    { title: 'Type', field: '_cls',
                        width:'10%',
                        cellStyle: {
                          width:'10%'
                        },
                     },
                    { title: 'Message', field: 'message',
                        width: "60%",
                        cellStyle: {
                          width: "60%",
                          maxWidth: "500px",
                          overflow: "hidden"
                        },
                        render: (rowData) => <div style={{"maxHeight": "90px", "overflow": "hidden"}}><span style={{"whiteSpace": 'pre-wrap'}}>{rowData.message}</span></div>
                     },
                  {
                      field: 'url',
                      title: 'Options',
                      render: (rowData) => <Button variant="contained"
                                                            size="small"
                                                            color={!this.state.muted[rowData._id] ? "default" : "primary"}
                                                            title={!this.state.muted[rowData._id] ? "Mute this error" : "Unmute this error"}
                                                            onClick={(evt) => this.toggleMuteError(evt, rowData)}>
                          <VolumeOffIcon />
                      </Button>,
                      width:'15%',
                      cellStyle: {
                          width: '15%'
                      }
                  }
                  ]}
                  data={tableData}
                  title=""
                  onRowClick={this.handleRowClick}
                  options={{
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