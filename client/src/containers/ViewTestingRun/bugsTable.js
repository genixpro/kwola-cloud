import React, { Component } from 'react';
//import {connect, Provider} from 'react-redux';
import {Table} from "../ListApplications/materialUiTables.style";
import {TableBody, TableCell, TableHead, TableRow, TablePagination} from "../../components/uielements/table";
import moment from 'moment';
import {connect, Provider} from 'react-redux';
class BugsTable extends Component{
	state = {
        newPage:0,
        setPage:0
    };
	handleChangePage = (event, newPage) => {
            console.log(event,newPage)
            this.setState({newPage:newPage})
            //setPage = newPage
            //setPage(newPage);
        };

	render(){
		 const rowsPerPage = 10;
        const setRowsPerPage = 10;
        const page = this.state.newPage
        let setPage = this.state.setPage

	 	return(
	 		<div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "normal",wordWrap: "break-word"}}>
                <Table>
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
                  //onChangeRowsPerPage={handleChangeRowsPerPage}
                />
                                    </div>
	    )
	}
}
const mapStateToProps = (state) => {return { ...state.BugsTable} };
export default connect(mapStateToProps)(BugsTable);