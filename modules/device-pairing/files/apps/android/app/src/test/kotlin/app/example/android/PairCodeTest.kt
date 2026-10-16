package app.example.android

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import java.util.Base64

class PairCodeTest {
    private fun code(json: String, prefix: String = "XXX1-") = prefix + Base64.getUrlEncoder().withoutPadding().encodeToString(json.toByteArray())

    @Test fun readsAddressTokenAndTheAccessToken() {
        val p = PairCode.decode(code("""{"u":"https://keep.example.com/","t":"tk_abc","i":"id.access","s":"shh"}"""))!!
        assertEquals("https://keep.example.com", p.url); assertEquals("tk_abc", p.token); assertEquals("id.access", p.cfId); assertEquals("shh", p.cfSecret)
    }

    @Test fun theAccessTokenNeedsBothParts() {
        val p = PairCode.decode(code("""{"u":"http://pi:47901","t":"t","i":"only-an-id"}"""))!!
        assertEquals("", p.cfId); assertEquals("", p.cfSecret)
    }

    @Test fun ignoresSpacesAndLineBreaksFromAMessenger() {
        val c = code("""{"u":"http://pi:47901","t":"t"}""")
        assertNotNull(PairCode.decode(" " + c.substring(0, 10) + "\n" + c.substring(10) + " "))
    }

    @Test fun refusesAnythingElse() {
        for (bad in listOf("", "hello", "XXX1-", "XXX1-###", code("""{"u":"ftp://x","t":"a"}"""), code("""{"u":"http://x"}"""), code("""{"u":"javascript:1","t":"a"}"""), code("""{"u":"http://x","t":"a"}""", "CUR1-")))
            assertNull(bad, PairCode.decode(bad))
    }
}
