import styled from 'styled-components';
import { palette } from 'styled-theme';
import WithDirection from '../../settings/withDirection';

import { createMuiTheme } from '@material-ui/core/styles';

const RunTypes = styled.div`
  .orange{
    background:#fb8c00;
    color:#fff;
  }
`;

export {RunTypes};
const CheckoutPageWrapper = styled.div`
  h3.sectionTitle {
    font-size: 16px;
    font-weight: 500;
    color: ${palette('grey', 9)};
    padding: 0 7px;
  }

  form {
    padding-right: 20px;

    @media only screen and (min-width: 768px) and (max-width: 991px) {
      padding-right: 0;
    }

    @media only screen and (max-width: 767px) {
      padding-right: 0;
    }

    .fullColumnWidth {
      width: 100%;
    }

    .billingFormField {
      margin-bottom: 20px;

      @media only screen and (min-width: 768px) and (max-width: 991px) {
        width: 100%;
      }

      @media only screen and (max-width: 767px) {
        width: 100%;
      }

      label {
        font-size: 0.9rem;
        color: ${palette('grey', 8)};
      }

      > div {
        input {
          height: 1.65em;
        }
      }

      &.selectField {
        > div > div > div {
          height: calc(1em + 14px);
          font-size: 0.9rem;
        }
      }
    }
  }

  .orderInfo {
    width: 100%;
    display: -webkit-box;
    display: -webkit-flex;
    display: -ms-flexbox;
    display: flex;
    -webkit-flex-direction: column;
    -ms-flex-direction: column;
    flex-direction: column;

    .orderTableHead {
      width: 100%;
      display: -webkit-box;
      display: -webkit-flex;
      display: -ms-flexbox;
      display: flex;
      -webkit-box-pack: justify;
      -webkit-justify-content: space-between;
      -ms-flex-pack: justify;
      justify-content: space-between;
      -webkit-align-items: center;
      -webkit-box-align: center;
      -ms-flex-align: center;
      align-items: center;
      margin-bottom: 20px;

      span.tableHead {
        font-size: 15px;
        font-weight: 500;
        color: ${palette('grey', 8)};
        line-height: 1.2;
      }
    }

    .orderTableBody {
      width: 100%;
      display: -webkit-box;
      display: -webkit-flex;
      display: -ms-flexbox;
      display: flex;
      -webkit-flex-direction: column;
      -ms-flex-direction: column;
      flex-direction: column;
      margin-bottom: 10px;

      .singleOrderInfo {
        width: 100%;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-pack: justify;
        -webkit-justify-content: space-between;
        -ms-flex-pack: justify;
        justify-content: space-between;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        padding: 10px 0;
        border-bottom: 1px solid ${palette('grey', 3)};

        p {
          margin: 0;

          span {
            font-size: 13px;
            font-weight: 400;
            color: ${palette('grey', 5)};
            line-height: 1.5;
            padding: 0 3px;
            display: inline-block;
          }

          span.quantity {
            font-size: 13px;
            font-weight: 400;
            color: ${palette('grey', 8)};
            line-height: 1.5;
            display: inline-block;
          }
        }

        .totalPrice {
          font-size: 13px;
          font-weight: 500;
          color: ${palette('grey', 5)};
          line-height: 1.5;
        }
      }
    }

    .orderTableFooter {
      width: 100%;
      display: -webkit-box;
      display: -webkit-flex;
      display: -ms-flexbox;
      display: flex;
      -webkit-box-pack: justify;
      -webkit-justify-content: space-between;
      -ms-flex-pack: justify;
      justify-content: space-between;
      -webkit-align-items: center;
      -webkit-box-align: center;
      -ms-flex-align: center;
      align-items: center;
      margin-bottom: 40px;

      span {
        font-size: 14px;
        font-weight: 500;
        color: ${palette('grey', 8)};
        line-height: 1.2;
      }
    }

    .orderBtn {
      width: 100%;
    }
  }
`;

export default WithDirection(CheckoutPageWrapper);
