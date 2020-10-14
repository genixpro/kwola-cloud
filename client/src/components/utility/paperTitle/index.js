import React from 'react';
import { PageTitle, PageSubTitle } from './paperTitle.style';

export default props => {
  return (
    <PageTitle
      style={{"display":"flex", "flexDirection": "row", "justifyContent": "space-between", ...props.style}}
      className={`${props[`data-single`] ? 'single' : ''} ${props.className}`}
    >
      <div>
        {props.title ? <h3>{props.title} {(props.tooltip ? props.tooltip : '')}</h3> : ''}

        {props.subtitle ? <PageSubTitle> {props.subtitle} </PageSubTitle> : ''}
      </div>

      {props.children}
    </PageTitle>
  );
};
