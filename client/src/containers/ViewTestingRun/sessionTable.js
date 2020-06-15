import React, { Component } from 'react';
import {connect, Provider} from 'react-redux';
import {Table} from "../ListApplications/materialUiTables.style";
import {TableBody, TableCell, TableHead, TableRow, TablePagination} from "../../components/uielements/table";
import moment from 'moment';
class SessionTable extends Component{
	state = {
        newPage:0,
        setPage:0
    };

	handleChangePage = (event, newPage) => {
        console.log(event,newPage)
        this.setState({newPage:newPage})
    };

	render(){
		 const rowsPerPage = 10;
        const setRowsPerPage = 10;
        const page = this.state.newPage
        let setPage = this.state.setPage

	 	return(
	 		<div>
		 		<Table>
			         <TableHead>
			             <TableRow>
			                 <TableCell>Browser Start Time</TableCell>
			                 <TableCell>Total Reward</TableCell>
			             </TableRow>
			         </TableHead>
			         <TableBody>
			             {(this.props.data ? this.props.data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage) : []).map(executionSession => {
			                 return (
			                     <TableRow key={executionSession._id} hover={true} onClick={() => this.props.history.push(`/app/dashboard/execution_sessions/${executionSession._id}`)} >
			                         <TableCell>{executionSession.startTime ? moment(new Date(executionSession.startTime.$date)).format('HH:mm MMM Do') : null}</TableCell>
			                         <TableCell>{executionSession.totalReward}</TableCell>
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
const mapStateToProps = (state) => {return { ...state.SessionTable} };
export default connect(mapStateToProps)(SessionTable);