import React, { Component } from 'react';
//import {connect, Provider} from 'react-redux';
import {Table} from "../ListApplications/materialUiTables.style";
import {TableBody, TableCell, TableHead, TableRow, TablePagination} from "../../components/uielements/table";
import moment from 'moment';
import {connect, Provider} from 'react-redux';
import MaterialTable from 'material-table'

class BugsTable extends Component{
	state = {
        newPage:0,
        setPage:0,
        rowsPerPage:10
    };
	// handleChangePage = (event, newPage) => {
 //            this.setState({newPage:newPage})
 //    };

 //    handleChangeRowsPerPage  = (event, rowsPerPage) => {
 //        this.setState({rowsPerPage:rowsPerPage.props.value})
 //    }

    handleRowClick = (event, rowData)=>{
        console.log(event,rowData)
        this.props.history.push(`/app/dashboard/bugs/${rowData._id}`)
    }

    processData = (data) => {
        console.log('table data prcoess',data)
        let rdata = []
        if(data){
            data.map(bug=>{
               
                rdata.push({_id:bug._id,message:bug.error.message,_cls:bug.error._cls})
            })
        }
        return rdata;
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
                    { title: 'CLS', field: '_cls' },
                    { title: 'Message', field: 'message' },
                  ]}
                  data={tableData}
                  title=""
                  onRowClick={this.handleRowClick}
                  options={{
                    pageSize:10,
                    pageSizeOptions:[10,20,50],
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