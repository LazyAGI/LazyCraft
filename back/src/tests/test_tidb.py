from sqlalchemy import URL, Column, Integer, String, create_engine, func
from sqlalchemy.orm import declarative_base, sessionmaker


def get_db_engine():
    # connect_args = {}
    # if ${ca_path}:
    #     connect_args = {
    #         "ssl_verify_cert": True,
    #         "ssl_verify_identity": True,
    #         "ssl_ca": ${ca_path},
    #     }
    return create_engine(
        URL.create(
            drivername="mysql+pymysql",
            username="root",
            password="",
            host="10.119.23.41",
            port="4000",
            database="test",
        ),
        # connect_args=connect_args,
    )


engine = get_db_engine()
Session = sessionmaker(bind=engine)
Base = declarative_base()


class Player(Base):
    id = Column(Integer, primary_key=True)
    name = Column(String(32), unique=True)
    coins = Column(Integer)
    goods = Column(Integer)

    __tablename__ = "players"

    def __str__(self):
        return f"Player(name={self.name}, coins={self.coins}, goods={self.goods})"


def simple_example() -> None:
    with Session() as session:
        # create a player, who has a coin and a goods.
        session.add(Player(name="test", coins=1, goods=1))

        # get this player, and print it.
        player = session.query(Player).filter(Player.name == "test").one()
        print(player)

        # create players with bulk inserts.
        # insert 200 players totally, with 50 players per batch.
        # all players have random uuid
        player_list = [
            Player(name=f"player_{i}", coins=10000, goods=100) for i in range(200)
        ]
        batch_size = 50
        for idx in range(0, len(player_list), batch_size):
            session.bulk_save_objects(player_list[idx : idx + batch_size])

        # print the number of players
        count = session.query(func.count(Player.id)).scalar()
        print(f"number of players: {count}")

        # print the first 3 players
        three_players = session.query(Player).order_by("id").limit(3).all()
        for player in three_players:
            print(player)

        session.commit()


def trade(buyer_id: int, seller_id: int, amount: int, price: int) -> None:
    # open a transaction, use select for update to lock the rows
    with Session() as session:
        buyer = (
            session.query(Player).filter(Player.id == buyer_id).with_for_update().one()
        )
        if buyer.coins < price:
            print("buyer coins not enough")
            return
        seller = (
            session.query(Player).filter(Player.id == seller_id).with_for_update().one()
        )
        if seller.goods < amount:
            print("seller goods not enough")
            return
        session.query(Player).filter(Player.id == buyer_id).update(
            {Player.coins: Player.coins - price, Player.goods: Player.goods + amount}
        )
        session.query(Player).filter(Player.id == seller_id).update(
            {Player.coins: Player.coins + price, Player.goods: Player.goods - amount}
        )
        session.commit()
        print("trade success")


def trade_example() -> None:
    with Session() as session:
        buyer = Player(name="buyer", coins=100, goods=0)
        seller = Player(name="seller", coins=0, goods=100)
        session.add_all([buyer, seller])
        session.commit()
        buyer_id, seller_id = buyer.id, seller.id
    # buyer wants to buy 10 goods from player 2.
    # it will cost 500 coins, but buyer cannot afford it.
    # so this trade will fail, and nobody will lose their coins or goods
    print("============== trade 1 start =================")
    trade(buyer_id=buyer_id, seller_id=seller_id, amount=10, price=500)
    print("============== trade 1 end ===================")

    # then player 1 has to reduce the incoming quantity to 2.
    # this trade will successful
    print("============== trade 2 start =================")
    trade(buyer_id=buyer_id, seller_id=seller_id, amount=10, price=100)
    print("============== trade 2 end ===================")

    with Session() as session:
        traders = (
            session.query(Player).filter(Player.id.in_((buyer_id, seller_id))).all()
        )
        for player in traders:
            print(player)


if __name__ == "__main__":
    try:
        Base.metadata.create_all(engine)
        simple_example()
        trade_example()
    finally:
        Base.metadata.drop_all(engine)
    print("🎉 所有测试通过！")
