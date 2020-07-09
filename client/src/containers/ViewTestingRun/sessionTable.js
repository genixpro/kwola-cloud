import React, { Component } from 'react';
import {connect, Provider} from 'react-redux';
import {Table} from "../ListApplications/materialUiTables.style";
import {TableBody, TableCell, TableHead, TableRow, TablePagination} from "../../components/uielements/table";
import moment from 'moment';
import MaterialTable from 'material-table'

class SessionTable extends Component{
	state = {
        newPage:0,
        setPage:0,
        rowsPerPage:10
    };

	// handleChangePage = (event, newPage) => {
 //        this.setState({newPage:newPage})
 //    };

 //    handleChangeRowsPerPage  = (event, rowsPerPage) => {
 //        this.setState({rowsPerPage:rowsPerPage.props.value})
 //    }

    handleRowClick = (event, rowData)=>{
    	console.log(event,rowData)
    	this.props.history.push(`/app/dashboard/execution_sessions/${rowData._id}`)
    }

    processData = (data) => {
    	console.log('table data prcoess',data)
    	let rdata = []
    	if(data){
    		data.map(session=>{
	    		let sTime = session.startTime ? moment(new Date(session.startTime.$date)).format('HH:mm MMM Do') : null
	    		rdata.push({_id:session._id,startTime:sTime, totalReward:session.totalReward})
	    	})
    	}
    	return rdata;
    }

	render(){
		const rowsPerPage = this.state.rowsPerPage;
        const setRowsPerPage = 10;
        const page = this.state.newPage
        let setPage = this.state.setPage
        let tableData = this.processData(this.props.data)
	 	return(
	 		<div>
		 		{/*<Table>
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
	              onChangeRowsPerPage={this.handleChangeRowsPerPage}
	            />*/}
		     	<MaterialTable
		          columns={[
		            { title: 'Browser Start', field: 'startTime' },
		            { title: 'Total Reward', field: 'totalReward' },
		            { title: 'id', field: '_id', hidden:true },
		          ]}
		          data={tableData}
		          title=""
		          onRowClick={this.handleRowClick}
		        />
	        </div>
	    )
	}
}
const mapStateToProps = (state) => {return { ...state.SessionTable} };
export default connect(mapStateToProps)(SessionTable);